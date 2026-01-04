import numpy as np
from typing import Any


def process_spectral_data(
    raw_data: dict[str, Any],
    bin_size: int = 50,
    wavelength_range: tuple[float | None, float | None] = (None, None),
) -> dict[str, Any]:
    """
    Process raw spectral data for visualization.

    - Applies wavelength filtering
    - Bins data for performance
    - Calculates variability metrics
    - Normalizes flux values
    """
    flux = np.array(raw_data["flux"]) if raw_data["flux"] else None
    wavelengths = np.array(raw_data["wavelength"]) if raw_data["wavelength"] else None
    times = np.array(raw_data["time"]) if raw_data["time"] else None

    if flux is None or wavelengths is None:
        raise ValueError("Missing flux or wavelength data")

    if flux.ndim == 1:
        flux = flux.reshape(1, -1)

    if wavelengths.ndim > 1:
        wavelengths = wavelengths.flatten()

    wl_min, wl_max = wavelength_range
    if wl_min is not None or wl_max is not None:
        mask = np.ones(len(wavelengths), dtype=bool)
        if wl_min is not None:
            mask &= wavelengths >= wl_min
        if wl_max is not None:
            mask &= wavelengths <= wl_max

        wavelengths = wavelengths[mask]
        flux = flux[:, mask] if flux.ndim > 1 else flux[mask]

    binned_wavelengths, binned_flux = _bin_data(wavelengths, flux, bin_size)

    median_flux = np.median(binned_flux, axis=0)
    normalized_flux = binned_flux / median_flux[np.newaxis, :]

    variability = (normalized_flux - 1) * 100

    if times is None:
        times = np.arange(binned_flux.shape[0])
    else:
        if len(times) != binned_flux.shape[0]:
            times = np.linspace(times.min(), times.max(), binned_flux.shape[0])

    return {
        "wavelengths": binned_wavelengths.tolist(),
        "times": times.tolist(),
        "flux": binned_flux.tolist(),
        "flux_normalized": normalized_flux.tolist(),
        "variability": variability.tolist(),
        "flux_mean": np.mean(binned_flux, axis=1).tolist(),
        "metadata": {
            "n_wavelengths": len(binned_wavelengths),
            "n_times": len(times),
            "wavelength_range": [float(binned_wavelengths.min()), float(binned_wavelengths.max())],
            "time_range": [float(times.min()), float(times.max())],
            "bin_size": bin_size,
        },
    }


def _bin_data(wavelengths: np.ndarray, flux: np.ndarray, bin_size: int) -> tuple[np.ndarray, np.ndarray]:
    """Bin spectral data to reduce size for visualization."""
    n_wavelengths = len(wavelengths)

    if n_wavelengths <= bin_size:
        return wavelengths, flux

    n_bins = n_wavelengths // bin_size
    trim = n_bins * bin_size

    wavelengths_trimmed = wavelengths[:trim]
    flux_trimmed = flux[:, :trim] if flux.ndim > 1 else flux[:trim]

    binned_wavelengths = wavelengths_trimmed.reshape(n_bins, bin_size).mean(axis=1)

    if flux_trimmed.ndim > 1:
        binned_flux = flux_trimmed.reshape(flux_trimmed.shape[0], n_bins, bin_size).mean(axis=2)
    else:
        binned_flux = flux_trimmed.reshape(n_bins, bin_size).mean(axis=1)

    return binned_wavelengths, binned_flux
