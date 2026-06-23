import os

from extract.rbi import (
    fetch_notifications,
    get_pdf_url
)

from transform.pdf_downloader import download_pdf
from transform.pdf_parser import extract_text_from_pdf
from transform.cleaner import clean_text
from transform.chunker import chunk_text

from load.supabase_loader import (
    insert_regulation,
    insert_chunks,
    regulation_exists
)


def process_notification(notification):

    print(
        f"\nProcessing: "
        f"{notification['title']}"
    )

    pdf_url = get_pdf_url(
        notification["notification_url"]
    )

    if not pdf_url:
        print("No PDF Found")
        return

    # Extract PDF name before download
    pdf_name = (
        pdf_url.split("/")[-1]
        .replace(".PDF", "")
    )

    # Duplicate Check
    if regulation_exists(pdf_name):

        print(
            f"Skipping Existing Regulation: "
            f"{pdf_name}"
        )

        return

    # Download PDF
    pdf_path = download_pdf(pdf_url)

    # Extract Text
    text = extract_text_from_pdf(pdf_path)

    # Clean Text
    cleaned_text = clean_text(text)

    # Chunk Text
    chunks = chunk_text(cleaned_text)

    # Prepare Data
    regulation_data = {
        "source": notification["source"],
        "pdf_name": pdf_name,
        "total_chunks": len(chunks),
        "content": cleaned_text
    }

    # Load Regulation
    regulation_id = insert_regulation(
        regulation_data
    )

    # Load Chunks
    insert_chunks(
        regulation_id,
        chunks
    )

    print(
        f"Loaded Successfully: "
        f"{notification['title']}"
    )

    # Delete PDF after successful load
    if os.path.exists(pdf_path):

        os.remove(pdf_path)

        print(
            f"Deleted PDF: "
            f"{pdf_path}"
        )


def main():

    notifications = fetch_notifications()

    print(
        f"Found "
        f"{len(notifications)} "
        f"notifications"
    )

    # Testing only first 3 notifications
    for notification in notifications[:20]:

        process_notification(
            notification
        )


if __name__ == "__main__":
    main()