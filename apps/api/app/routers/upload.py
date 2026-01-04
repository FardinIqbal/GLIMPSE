import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.fits_parser import parse_fits_file

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../../data")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/")
async def upload_fits_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".fits"):
        raise HTTPException(status_code=400, detail="Only FITS files are accepted")

    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.fits")

    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        metadata = parse_fits_file(file_path)

        return {
            "file_id": file_id,
            "filename": file.filename,
            "metadata": metadata,
        }
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_uploaded_files():
    files = []
    for filename in os.listdir(UPLOAD_DIR):
        if filename.endswith(".fits"):
            file_id = filename.replace(".fits", "")
            files.append({"file_id": file_id, "filename": filename})
    return {"files": files}
