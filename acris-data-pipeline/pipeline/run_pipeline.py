import os

from extract.rbi import (
    fetch_notifications,
    get_pdf_url
)

from transform.pdf_downloader import (
    download_pdf
)

from transform.pdf_parser import (
    extract_text_from_pdf
)

from transform.cleaner import (
    clean_text
)

from transform.regulation_extractor import (
    extract_regulations
)

from transform.chunker import (
    chunk_text
)

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

    pdf_name = (
        pdf_url.split("/")[-1]
        .replace(".PDF", "")
        .replace(".pdf", "")
    )

    if regulation_exists(pdf_name):

        print(
            f"Skipping Existing Regulation: "
            f"{pdf_name}"
        )

        return

    # Download PDF
    pdf_path = download_pdf(pdf_url)

    # Extract Text
    text = extract_text_from_pdf(
        pdf_path
    )

    # Clean Text
    cleaned_text = clean_text(
        text
    )

    print(
        f"Original Length: "
        f"{len(cleaned_text)}"
    )

    # Extract Regulations Only
    regulation_text = extract_regulations(
        cleaned_text
    )

    print(
        f"Regulation Length: "
        f"{len(regulation_text)}"
    )

    if not regulation_text:

        print(
            "No Regulations Found."
        )

        return

    # Create Chunks
    chunks = chunk_text(
        regulation_text
    )

    print(
        f"Total Chunks: "
        f"{len(chunks)}"
    )

    # Prepare Data
    regulation_data = {

        "source":
            notification["source"],

        "pdf_name":
            pdf_name,

        "total_chunks":
            len(chunks),

        "content":
            regulation_text
    }

    # Insert Regulation
    regulation_id = insert_regulation(
        regulation_data
    )

    # Insert Chunks
    insert_chunks(
        regulation_id,
        chunks
    )

    print(
        f"Loaded Successfully: "
        f"{notification['title']}"
    )

    # Delete PDF
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

    for notification in notifications[:20]:

        process_notification(
            notification
        )


if __name__ == "__main__":

    main()