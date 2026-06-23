import os
import re
import uuid
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
from sqlalchemy.orm import Session
from datetime import datetime, date
from app.models.models import Regulation
from app.core.ai_service import LlamaAIService
from app.core.config import settings

RBI_URL = "https://www.rbi.org.in/Scripts/NotificationUser.aspx"
STORAGE_DIR = os.path.join(settings.STORAGE_PATH, "documents")

def fetch_notifications():
    """
    Fetch all RBI notifications from the RBI notification page.
    """
    try:
        response = requests.get(RBI_URL, timeout=30)
        if response.status_code != 200:
            print(f"[Scraper] Unable to fetch RBI page. Status Code: {response.status_code}")
            return []
        
        soup = BeautifulSoup(response.text, "html.parser")
        notifications = []
        links = soup.find_all("a")
        
        for link in links:
            href = link.get("href")
            if not href or "NotificationUser.aspx?Id=" not in href:
                continue
            
            title = link.get_text(strip=True)
            if not title:
                continue
            
            notification_url = "https://www.rbi.org.in/Scripts/" + href
            notifications.append({
                "source": "RBI",
                "title": title,
                "notification_url": notification_url
            })
        return notifications
    except Exception as e:
        print(f"[Scraper] Error fetching notifications: {e}")
        return []

def get_pdf_url(notification_url):
    """
    Extract PDF URL from an RBI notification page.
    """
    try:
        response = requests.get(notification_url, timeout=30)
        if response.status_code != 200:
            print(f"[Scraper] Failed to open notification page: {notification_url}")
            return None
        
        html = response.text
        match = re.search(
            r"https://rbidocs\.rbi\.org\.in/rdocs/notification/PDFs/[A-Za-z0-9_\-\.]+\.PDF",
            html,
            re.IGNORECASE
        )
        if match:
            return match.group(0)
        return None
    except Exception as e:
        print(f"[Scraper] Error getting PDF URL: {e}")
        return None

def download_pdf(pdf_url):
    """
    Download PDF to temporary local path.
    """
    try:
        os.makedirs(STORAGE_DIR, exist_ok=True)
        temp_filename = f"temp_scrape_{uuid.uuid4().hex}.pdf"
        local_path = os.path.join(STORAGE_DIR, temp_filename)
        
        response = requests.get(pdf_url, timeout=45)
        if response.status_code == 200:
            with open(local_path, "wb") as f:
                f.write(response.content)
            return local_path
        return None
    except Exception as e:
        print(f"[Scraper] Error downloading PDF: {e}")
        return None

def extract_and_clean_text(pdf_path):
    """
    Extract text using pypdf and clean extra whitespace.
    """
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        
        # Clean extra whitespace
        text = re.sub(r"\s+", " ", text).strip()
        return text
    except Exception as e:
        print(f"[Scraper] Error parsing PDF text: {e}")
        return ""

def scrape_latest_regulations(db: Session, limit: int = 5) -> int:
    """
    Main scraper execution flow. Fetches notifications, parses new ones,
    runs Llama 3 analysis, and stores the regulation in the database.
    """
    print("[Scraper] Running auto scraping pipeline...")
    notifications = fetch_notifications()
    print(f"[Scraper] Found {len(notifications)} notifications on RBI portal.")
    
    new_regulations_count = 0
    
    # Process only unique notifications up to the limit
    processed_count = 0
    for item in notifications:
        if processed_count >= limit:
            break
            
        title = item["title"]
        link = item["notification_url"]
        
        # Duplicate check: check if it already exists in our database by title or link
        exists = db.query(Regulation).filter(
            (Regulation.title == title) | (Regulation.link == link)
        ).first()
        
        if exists:
            # We already have this regulation, skip it
            continue
            
        print(f"[Scraper] New regulation detected: {title}")
        pdf_url = get_pdf_url(link)
        if not pdf_url:
            print(f"[Scraper] Skipping: No PDF found for {title}")
            continue
            
        pdf_path = download_pdf(pdf_url)
        if not pdf_path:
            print(f"[Scraper] Skipping: Failed to download PDF for {title}")
            continue
            
        try:
            text = extract_and_clean_text(pdf_path)
            if not text:
                print(f"[Scraper] Skipping: Empty text extracted from {title}")
                continue
                
            # Perform Llama 3 structured analysis
            print(f"[Scraper] Analyzing content using Llama 3 for: {title}")
            analysis = LlamaAIService.analyze_scraped_regulation(title, text)
            
            # Parse publication date
            pub_date = date.today()
            date_str = analysis.get("date")
            if date_str:
                try:
                    pub_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                except ValueError:
                    pass
            
            # Insert into database
            new_reg = Regulation(
                source="RBI",
                title=title,
                date=pub_date,
                link=pdf_url, # Link to PDF directly
                summary=analysis.get("summary", ""),
                risk_level=analysis.get("risk_level", "Medium"),
                obligations=analysis.get("obligations", []),
                suggested_actions=analysis.get("suggested_actions", [])
            )
            db.add(new_reg)
            db.commit()
            
            # --- Automation Pipeline ---
            # Create a Document for the scraped regulation for all users
            import uuid as uuid_pkg
            import shutil
            from app.models.models import User, Document
            from app.core.pipeline import execute_downstream_pipeline
            
            users = db.query(User).all()
            for u in users:
                # check if document already exists for this user and this title
                exists_doc = db.query(Document).filter(
                    Document.user_id == u.id,
                    Document.title == title
                ).first()
                if exists_doc:
                    continue
                    
                doc_id = uuid_pkg.uuid4()
                permanent_filename = f"scraped_{doc_id.hex}.pdf"
                permanent_path = os.path.join(STORAGE_DIR, permanent_filename)
                try:
                    shutil.copy(pdf_path, permanent_path)
                except Exception as e:
                    print(f"[Scraper] Failed to copy temp PDF: {e}")
                    permanent_filename = os.path.basename(pdf_path)

                db_doc = Document(
                    id=doc_id,
                    user_id=u.id,
                    title=title,
                    source="RBI",
                    file_path=f"/storage/documents/{permanent_filename}",
                    status="extracted",
                    extracted_text=text,
                    copilot_mode="beginner"
                )
                db.add(db_doc)
                db.commit()
                db.refresh(db_doc)

                try:
                    execute_downstream_pipeline(db, db_doc, u.id, "beginner")
                except Exception as e:
                    print(f"[Scraper] Error in pipeline for user {u.email}: {e}")
            # ---------------------------

            new_regulations_count += 1
            processed_count += 1
            print(f"[Scraper] Successfully ingested: {title} (Risk: {new_reg.risk_level})")
            
        except Exception as e:
            db.rollback()
            print(f"[Scraper] Failed to process regulation {title}: {e}")
        finally:
            # Clean up local temp file
            if pdf_path and os.path.exists(pdf_path):
                try:
                    os.remove(pdf_path)
                except Exception as ex:
                    print(f"[Scraper] Error deleting temp PDF {pdf_path}: {ex}")
                    
    return new_regulations_count
