import os
import re
import uuid
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
from sqlalchemy.orm import Session
from datetime import datetime, date
from app.models.models import Regulation, RegulationChunk
from app.core.ai_service import LlamaAIService
from app.core.config import settings

RBI_URL = "https://www.rbi.org.in/Scripts/NotificationUser.aspx"
STORAGE_DIR = os.path.join(settings.STORAGE_PATH, "documents")

_CHROMA_API_KEY    = os.getenv("CHROMA_API_KEY",    "ck-J8T4rhpHwaRyhni6jh2PGkRDNFLTFzxAF7ysxoXcKB49")
_CHROMA_TENANT     = os.getenv("CHROMA_TENANT",     "8a810af5-e80b-474e-b853-5a7eb2db214c")
_CHROMA_DB         = os.getenv("CHROMA_DB",          "acris-data")
_CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION",  "regulations_bge")

HIGH_PRIORITY = [
    "shall", "shall not", "must", "required to", "mandatory",
    "obligation", "compliance", "penalty", "violation",
    "contravention", "under section"
]
MEDIUM_PRIORITY = [
    "amendment", "amended", "modified", "inserted", "replaced",
    "revised", "withdrawn", "exemption", "waiver", "maintain",
    "submit", "report", "disclose", "furnish", "audit",
    "inspect", "monitor", "verify"
]
LOW_PRIORITY = [
    "guidelines", "circular", "threshold", "limit", "ceiling",
    "maximum", "minimum", "quarterly return", "monthly return",
    "annual return", "regulatory filing"
]

def _extract_priority_regulations(text: str) -> str:
    paragraphs = text.split("\n\n")
    regulations = []
    for para in paragraphs:
        para = para.strip()
        if len(para) < 50:
            continue
        para_lower = para.lower()
        score = 0
        for keyword in HIGH_PRIORITY:
            if keyword in para_lower:
                score += 3
        for keyword in MEDIUM_PRIORITY:
            if keyword in para_lower:
                score += 2
        for keyword in LOW_PRIORITY:
            if keyword in para_lower:
                score += 1
        if score >= 3:
            regulations.append(para)
    return "\n\n".join(regulations)

def _chunk_text(text: str, chunk_size: int = 500) -> list[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
    return chunks

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
            db.refresh(new_reg)
            
            # --- Ingestion & Chunking Pipeline Integration ---
            try:
                # 1. Filter out preambles & boilerplate paragraphs (score >= 3 keywords scoring)
                filtered_text = _extract_priority_regulations(text)
                
                # 2. Chunk text in segments of 500 words
                chunks = _chunk_text(filtered_text or text)
                
                # 3. Store chunks in relational database
                for idx, chunk in enumerate(chunks):
                    db_chunk = RegulationChunk(
                        regulation_id=new_reg.id,
                        chunk_index=idx + 1,
                        chunk_text=chunk
                    )
                    db.add(db_chunk)
                db.commit()
                
                # 4. Generate embeddings and store in ChromaDB Cloud regulations_bge collection
                import chromadb
                from app.core.embeddings import EmbeddingService
                
                chroma_client = chromadb.CloudClient(
                    api_key=_CHROMA_API_KEY,
                    tenant=_CHROMA_TENANT,
                    database=_CHROMA_DB
                )
                collection = chroma_client.get_or_create_collection(_CHROMA_COLLECTION)
                
                # Compute embeddings using dynamic embedding service
                embeddings = EmbeddingService.batch_encode(chunks) if chunks else []
                
                for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                    chunk_id = f"{new_reg.id}_{idx + 1}"
                    collection.add(
                        ids=[chunk_id],
                        documents=[chunk],
                        embeddings=[emb],
                        metadatas=[{
                            "regulation_id": str(new_reg.id),
                            "pdf_name": title,
                            "source": "RBI",
                            "chunk_index": idx + 1
                        }]
                    )
                print(f"[Scraper] Successfully loaded {len(chunks)} chunks to ChromaDB collection {_CHROMA_COLLECTION}.")
            except Exception as pipe_err:
                print(f"[Scraper] Warning: Ingestion pipeline / ChromaDB storage failed: {pipe_err}")
            # -------------------------------------------------
            
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
