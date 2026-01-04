import numpy as np
from astropy.io import fits
from typing import Any


def parse_fits_file(file_path: str, include_data: bool = False) -> dict[str, Any]:
    """
    Parse a FITS file and extract spectral data.

    Supports multiple FITS formats:
    - Standard x1d spectral products
    - Custom flux/wavelength/time arrays
    - NIRSpec and MIRI instrument data
    """
    with fits.open(file_path) as hdul:
        metadata = {
            "n_extensions": len(hdul),
            "primary_header": dict(hdul[0].header),
            "extensions": [],
        }

        flux_data = None
        wavelength_data = None
        time_data = None
        variance_data = None

        for i, hdu in enumerate(hdul):
            ext_info = {
                "index": i,
                "name": hdu.name,
                "type": type(hdu).__name__,
            }

            if hasattr(hdu, "columns") and hdu.columns is not None:
                ext_info["columns"] = [col.name for col in hdu.columns]

            if hasattr(hdu, "data") and hdu.data is not None:
                if hasattr(hdu.data, "shape"):
                    ext_info["shape"] = hdu.data.shape
                    ext_info["dtype"] = str(hdu.data.dtype)

            metadata["extensions"].append(ext_info)

            if include_data:
                flux_data, wavelength_data, time_data, variance_data = _extract_data(
                    hdu, flux_data, wavelength_data, time_data, variance_data
                )

        instrument = metadata["primary_header"].get("INSTRUME", "unknown")
        metadata["instrument"] = instrument

        if include_data:
            result = {
                "metadata": metadata,
                "flux": _to_list(flux_data),
                "wavelength": _to_list(wavelength_data),
                "time": _to_list(time_data),
                "variance": _to_list(variance_data),
            }
            return result

        return metadata


def _extract_data(hdu, flux, wavelength, time, variance):
    """Extract data arrays from HDU based on column names or array structure."""
    if hasattr(hdu, "columns") and hdu.columns is not None:
        col_names = [col.name.upper() for col in hdu.columns]

        for name in ["FLUX", "FLUX_ARRAY", "SCI", "DATA"]:
            if name in col_names and flux is None:
                flux = hdu.data[name]
                break

        for name in ["WAVELENGTH", "WAVE", "LAMBDA", "WL"]:
            if name in col_names and wavelength is None:
                wavelength = hdu.data[name]
                break

        for name in ["TIME", "MJD", "MJD_MID", "TSTART"]:
            if name in col_names and time is None:
                time = hdu.data[name]
                break

        for name in ["VARIANCE", "ERR", "ERROR", "VAR"]:
            if name in col_names and variance is None:
                variance = hdu.data[name]
                break

    elif hasattr(hdu, "data") and hdu.data is not None:
        if isinstance(hdu.data, np.ndarray):
            name = hdu.name.upper()
            if "FLUX" in name and flux is None:
                flux = hdu.data
            elif "WAVE" in name or "WL" in name and wavelength is None:
                wavelength = hdu.data
            elif "MJD" in name or "TIME" in name and time is None:
                time = hdu.data
            elif "VAR" in name or "ERR" in name and variance is None:
                variance = hdu.data

    return flux, wavelength, time, variance


def _to_list(arr):
    """Convert numpy array to nested list for JSON serialization."""
    if arr is None:
        return None
    if isinstance(arr, np.ndarray):
        return arr.tolist()
    return arr
