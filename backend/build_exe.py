import PyInstaller.__main__
import os
import shutil

# Directories
backend_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dist = os.path.join(os.path.dirname(backend_dir), "acris-dashboard", "dist")

if not os.path.exists(frontend_dist):
    print("Error: Frontend dist directory not found. Run 'npm run build' in acris-dashboard first.")
    exit(1)

# PyInstaller arguments
args = [
    'run_app.py',                     # Entry point script
    '--name=AcrisApp',                # Name of the executable
    '--onefile',                      # Build as a single .exe
    # '--windowed',                     # Uncomment to hide the console window (makes it fully background)
    
    # Add frontend dist folder as data
    f'--add-data={frontend_dist};acris-dashboard/dist',
    
    # Hidden imports for FastAPI and SQLAlchemy
    '--hidden-import=uvicorn',
    '--hidden-import=fastapi',
    '--hidden-import=pydantic',
    '--hidden-import=sqlalchemy.sql.default_comparator',
    '--hidden-import=sqlalchemy.ext.baked',
    
    # Critical hidden imports for PyTorch & Transformers
    # NOTE: These will make the .exe massive!
    '--hidden-import=torch',
    '--hidden-import=transformers',
    '--hidden-import=chromadb',
    '--hidden-import=sentence_transformers',
    
    # Clean previous builds
    '--clean',
    '--noconfirm',
]

print("Starting PyInstaller build...")
PyInstaller.__main__.run(args)
print("Build complete! Check the 'dist' directory for AcrisApp.exe")
