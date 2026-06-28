from fastapi import APIRouter, BackgroundTasks, HTTPException
from typing import Dict, Any
import os
import aiohttp
import asyncio
from app.core.config import settings

router = APIRouter()

# Global state to track download progress
download_state = {
    "is_downloading": False,
    "progress": 0,
    "status": "Idle",
    "total_bytes": 0,
    "downloaded_bytes": 0
}

def get_model_path() -> str:
    model_name = getattr(settings, "OLLAMA_MODEL", "llama3.gguf")
    if not model_name.endswith(".gguf"):
        model_name += ".gguf"
    models_dir = os.path.join(settings.STORAGE_PATH, "models")
    os.makedirs(models_dir, exist_ok=True)
    return os.path.join(models_dir, model_name)

@router.get("/status")
def get_system_status() -> Dict[str, Any]:
    """Check if the required AI model is present on disk."""
    model_path = get_model_path()
    is_ready = os.path.exists(model_path) and os.path.getsize(model_path) > 1024 * 1024 # At least 1MB
    
    return {
        "model_downloaded": is_ready,
        "model_path": model_path,
        "download_state": download_state
    }

async def download_model_task(url: str, dest_path: str):
    global download_state
    download_state["is_downloading"] = True
    download_state["progress"] = 0
    download_state["status"] = "Connecting..."
    download_state["downloaded_bytes"] = 0

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    download_state["status"] = f"Error: HTTP {response.status}"
                    download_state["is_downloading"] = False
                    return

                total_size = int(response.headers.get("Content-Length", 0))
                download_state["total_bytes"] = total_size
                download_state["status"] = "Downloading AI Engine..."

                with open(dest_path, "wb") as f:
                    async for chunk in response.content.iter_chunked(1024 * 1024): # 1MB chunks
                        if chunk:
                            f.write(chunk)
                            download_state["downloaded_bytes"] += len(chunk)
                            if total_size > 0:
                                download_state["progress"] = int((download_state["downloaded_bytes"] / total_size) * 100)
                
                download_state["progress"] = 100
                download_state["status"] = "Download Complete"
    except Exception as e:
        download_state["status"] = f"Error: {str(e)}"
    finally:
        download_state["is_downloading"] = False

@router.post("/download-model")
def start_model_download(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    global download_state
    if download_state["is_downloading"]:
        return {"message": "Download already in progress"}
        
    model_path = get_model_path()
    model_url = "https://huggingface.co/marutii15/acris-ai-engine/resolve/main/llama3.gguf?download=true"
    
    background_tasks.add_task(download_model_task, model_url, model_path)
    return {"message": "Download started"}
