import os

# Local Qwen2.5-VL-3B-Instruct model location
MODEL_PATH = "C:/AI-Models/Qwen2.5-VL-3B-Instruct"

# Directory paths
UPLOAD_REG_DIR = os.path.abspath("uploads/regulations")
UPLOAD_PROOF_DIR = os.path.abspath("uploads/proofs")
STATIC_DIR = os.path.abspath("static")

# Ensure required directories exist
os.makedirs(UPLOAD_REG_DIR, exist_ok=True)
os.makedirs(UPLOAD_PROOF_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)
