import os
from fastapi import APIRouter, HTTPException, Query
from app.services.fits_parser import parse_fits_file
from app.services.data_processor import process_spectral_data

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), "../../data")


@router.get("/{file_id}")
async def get_spectral_data(
    file_id: str,
    bin_size: int = Query(default=50, ge=10, le=200),
    wavelength_min: float = Query(default=None),
    wavelength_max: float = Query(default=None),
):
    file_path = os.path.join(DATA_DIR, f"{file_id}.fits")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        raw_data = parse_fits_file(file_path, include_data=True)
        processed = process_spectral_data(
            raw_data,
            bin_size=bin_size,
            wavelength_range=(wavelength_min, wavelength_max),
        )
        return processed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{file_id}/variability")
async def get_variability_map(
    file_id: str,
    bin_size: int = Query(default=50, ge=10, le=200),
):
    file_path = os.path.join(DATA_DIR, f"{file_id}.fits")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        raw_data = parse_fits_file(file_path, include_data=True)
        processed = process_spectral_data(raw_data, bin_size=bin_size)

        return {
            "wavelengths": processed["wavelengths"],
            "times": processed["times"],
            "variability": processed["variability"],
            "metadata": processed["metadata"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{file_id}/lightcurve")
async def get_light_curve(
    file_id: str,
    wavelength: float = Query(..., description="Target wavelength in microns"),
    tolerance: float = Query(default=0.1, description="Wavelength tolerance"),
):
    file_path = os.path.join(DATA_DIR, f"{file_id}.fits")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        raw_data = parse_fits_file(file_path, include_data=True)
        processed = process_spectral_data(
            raw_data,
            wavelength_range=(wavelength - tolerance, wavelength + tolerance),
        )

        return {
            "times": processed["times"],
            "flux": processed["flux_mean"],
            "wavelength_center": wavelength,
            "metadata": processed["metadata"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
