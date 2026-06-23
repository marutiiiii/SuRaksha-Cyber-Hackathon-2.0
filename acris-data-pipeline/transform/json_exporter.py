import json
from pathlib import Path


def save_to_json(data, output_dir="data/processed"):
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    file_path = Path(output_dir) / f"{data['pdf_name']}.json"

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    print(f"JSON saved: {file_path}")