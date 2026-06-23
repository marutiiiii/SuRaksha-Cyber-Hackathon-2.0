import requests
from pathlib import Path


def download_pdf(pdf_url, save_dir="data/raw"):
    Path(save_dir).mkdir(parents=True, exist_ok=True)

    filename = pdf_url.split("/")[-1]
    file_path = Path(save_dir) / filename

    response = requests.get(pdf_url)

    if response.status_code == 200:
        with open(file_path, "wb") as f:
            f.write(response.content)

        print(f"Downloaded: {filename}")
        return str(file_path)

    raise Exception(f"Failed to download PDF: {pdf_url}")