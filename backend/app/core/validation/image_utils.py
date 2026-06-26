"""
Image utilities for the ReguFlow validation engine.
Handles PDF-to-image conversion and image validation.
"""
import os
import fitz  # PyMuPDF
import tempfile
from PIL import Image
from typing import List


def convert_pdf_to_images(pdf_path: str, max_pages: int = 3) -> List[str]:
    """
    Render PDF pages to temporary PNG images.
    Returns a list of absolute paths to the rendered page images.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found at: {pdf_path}")

    image_paths = []
    doc = fitz.open(pdf_path)
    pages_to_render = min(len(doc), max_pages)

    temp_dir = tempfile.gettempdir()

    for i in range(pages_to_render):
        page = doc[i]
        # Use high resolution zoom for clear text extraction (2.0x zoom)
        zoom = 2.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)

        img_path = os.path.join(temp_dir, f"acris_pdf_page_{os.path.basename(pdf_path)}_{i}.png")
        pix.save(img_path)
        image_paths.append(img_path)

    doc.close()
    return image_paths


def validate_image(image_path: str) -> bool:
    """
    Validate if an image file exists, is not empty, and can be opened by PIL.
    """
    if not os.path.exists(image_path):
        return False
    if os.path.getsize(image_path) == 0:
        return False
    try:
        with Image.open(image_path) as img:
            img.verify()
        return True
    except Exception:
        return False
