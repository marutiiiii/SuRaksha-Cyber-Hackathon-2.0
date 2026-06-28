import os
import sys
import multiprocessing

def setup_persistent_paths():
    """Configure paths for the database, storage, and chroma db so they persist across .exe runs."""
    appdata = os.environ.get("APPDATA") or os.path.expanduser("~/.config")
    app_dir = os.path.join(appdata, "AcrisApp")
    os.makedirs(app_dir, exist_ok=True)
    
    # Set environment variables BEFORE importing anything from backend that depends on settings
    os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(app_dir, 'backend.db')}"
    os.environ["STORAGE_DIR"] = os.path.join(app_dir, "storage")
    os.environ["CHROMADB_PATH"] = os.path.join(app_dir, "chroma_db")
    
    print(f"Persistent data directory: {app_dir}")

if __name__ == "__main__":
    # Required for PyInstaller multiprocessing on Windows
    multiprocessing.freeze_support()
    
    setup_persistent_paths()
    
    # Import uvicorn and our app only after paths are set
    import uvicorn
    import webbrowser
    import threading
    import time
    from app.main import app
    
    # Open browser automatically after a short delay
    def open_browser():
        time.sleep(2)
        webbrowser.open("http://127.0.0.1:8000")
        
    threading.Thread(target=open_browser, daemon=True).start()
    
    print("Starting Acris Application Server on http://127.0.0.1:8000...")
    # Using the app instance directly because string reference ("app.main:app") can fail in PyInstaller
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
