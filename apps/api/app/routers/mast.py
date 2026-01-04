"""MAST archive API routes for real JWST data."""

import asyncio
from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from typing import Optional
from dataclasses import asdict

from app.services.mast_client import get_mast_client, MASTClient

router = APIRouter()


@router.get("/targets")
async def get_featured_targets():
    """Get featured exoplanet targets with known transit observations."""
    client = get_mast_client()
    return {"targets": client.get_featured_targets()}


@router.get("/molecular-bands")
async def get_molecular_bands():
    """Get molecular absorption band wavelength ranges."""
    client = get_mast_client()
    return {"bands": client.get_molecular_bands()}


@router.get("/search")
async def search_observations(
    target: str = Query(..., description="Target name (e.g., WASP-39)"),
    instrument: str = Query(default="NIRSPEC", description="JWST instrument"),
):
    """
    Search MAST for JWST spectroscopy observations of a target.

    Returns list of available observations with metadata.
    """
    client = get_mast_client()

    # Run in thread pool since astroquery is synchronous
    loop = asyncio.get_event_loop()
    observations = await loop.run_in_executor(
        None,
        lambda: client.search_jwst_observations(target, instrument)
    )

    return {
        "target": target,
        "instrument": instrument,
        "count": len(observations),
        "observations": [asdict(obs) for obs in observations],
    }


@router.get("/observation/{obs_id}/products")
async def get_observation_products(obs_id: str):
    """Get downloadable data products for an observation."""
    client = get_mast_client()

    loop = asyncio.get_event_loop()
    products = await loop.run_in_executor(
        None,
        lambda: client.get_observation_products(obs_id)
    )

    return {
        "obs_id": obs_id,
        "products": products,
    }


@router.post("/observation/{obs_id}/download")
async def download_observation(
    obs_id: str,
    product_type: str = Query(default="x1d", description="Product type (x1d, s2d)"),
):
    """
    Download and cache a JWST observation.

    Returns the parsed spectral data.
    """
    client = get_mast_client()

    loop = asyncio.get_event_loop()

    # Download the product
    fits_path = await loop.run_in_executor(
        None,
        lambda: client.download_product(obs_id, product_type)
    )

    if fits_path is None:
        raise HTTPException(status_code=404, detail="Could not download observation")

    # Parse the spectrum
    try:
        spectrum = await loop.run_in_executor(
            None,
            lambda: client.parse_x1d_spectrum(fits_path)
        )
        return {
            "obs_id": obs_id,
            "cached": True,
            "spectrum": spectrum,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing spectrum: {str(e)}")


@router.get("/exoplanet/{planet_name}")
async def get_exoplanet_info(planet_name: str):
    """Get exoplanet properties from exo.MAST."""
    client = get_mast_client()
    info = await client.get_exoplanet_info(planet_name)

    if info is None:
        raise HTTPException(status_code=404, detail="Exoplanet not found")

    return asdict(info)


@router.get("/exoplanet/{planet_name}/published-spectra")
async def get_published_spectra(planet_name: str):
    """Get published transmission spectra from exo.MAST STATES database."""
    client = get_mast_client()
    spectra = await client.get_published_spectrum(planet_name)

    if spectra is None:
        return {"available": False, "count": 0, "spectra": []}

    return spectra


@router.get("/demo-data/{target}")
async def get_demo_transit_data(
    target: str,
    bin_size: int = Query(default=20, ge=5, le=100),
):
    """
    Get simulated transit spectroscopy data for demo purposes.

    This endpoint provides realistic simulated data when real data
    is not available or for testing the visualization.
    """
    import numpy as np

    # Generate realistic wavelength grid (NIRSpec range)
    n_wavelengths = 200
    wavelengths = np.linspace(0.6, 5.3, n_wavelengths)

    # Generate time/phase grid
    n_times = 100
    phase = np.linspace(-0.05, 0.05, n_times)  # Transit phase

    # Base transit model
    transit_duration = 0.03
    ingress = 0.005

    def transit_model(t, depth=0.015):
        lc = np.ones_like(t)
        in_transit = np.abs(t) < transit_duration / 2
        in_ingress = (np.abs(t) > transit_duration / 2 - ingress) & in_transit
        lc[in_transit] = 1 - depth
        lc[in_ingress] = 1 - depth * (1 - (np.abs(t[in_ingress]) - transit_duration / 2 + ingress) / ingress)
        return lc

    # Generate 2D flux array with wavelength-dependent transit depth
    flux = np.zeros((n_times, n_wavelengths))

    # Molecular absorption features
    molecular_effects = {
        "H2O": [(1.35, 1.45, 0.003), (1.8, 2.0, 0.004), (2.7, 3.0, 0.005)],
        "CO2": [(4.2, 4.4, 0.006)],
        "CO": [(4.5, 5.0, 0.004)],
        "CH4": [(2.2, 2.4, 0.002), (3.3, 3.5, 0.003)],
    }

    base_depth = 0.012

    for i, wl in enumerate(wavelengths):
        depth = base_depth
        for molecule, features in molecular_effects.items():
            for wl_min, wl_max, extra_depth in features:
                if wl_min <= wl <= wl_max:
                    center = (wl_min + wl_max) / 2
                    width = (wl_max - wl_min) / 2
                    depth += extra_depth * np.exp(-((wl - center) ** 2) / (2 * (width / 2) ** 2))
        flux[:, i] = transit_model(phase, depth)

    # Add noise
    flux += np.random.normal(0, 0.0005, flux.shape)

    # Calculate transmission spectrum with uncertainty
    in_transit_mask = np.abs(phase) < transit_duration / 2
    out_transit_mask = np.abs(phase) > transit_duration / 2 + 0.01

    in_transit_flux = np.mean(flux[in_transit_mask], axis=0)
    out_transit_flux = np.mean(flux[out_transit_mask], axis=0)
    transit_depth = (1 - in_transit_flux / out_transit_flux) * 1e6

    # Calculate uncertainty from scatter
    in_transit_std = np.std(flux[in_transit_mask], axis=0)
    out_transit_std = np.std(flux[out_transit_mask], axis=0)
    # Propagate uncertainty
    transit_depth_err = np.sqrt(in_transit_std**2 + out_transit_std**2) / out_transit_flux * 1e6

    # Bin data
    if bin_size > 1:
        n_bins = n_wavelengths // bin_size
        wavelengths_binned = wavelengths[:n_bins * bin_size].reshape(n_bins, bin_size).mean(axis=1)
        transit_depth_binned = transit_depth[:n_bins * bin_size].reshape(n_bins, bin_size).mean(axis=1)
        # Error decreases with sqrt(n) when binning
        transit_depth_err_binned = transit_depth_err[:n_bins * bin_size].reshape(n_bins, bin_size).mean(axis=1) / np.sqrt(bin_size)
        flux_binned = flux[:, :n_bins * bin_size].reshape(n_times, n_bins, bin_size).mean(axis=2)
    else:
        wavelengths_binned = wavelengths
        transit_depth_binned = transit_depth
        transit_depth_err_binned = transit_depth_err
        flux_binned = flux

    return {
        "target": target,
        "data_source": "simulated",
        "wavelengths": wavelengths_binned.tolist(),
        "phase": phase.tolist(),
        "flux": flux_binned.tolist(),
        "transmission_spectrum": {
            "wavelengths": wavelengths_binned.tolist(),
            "transit_depth_ppm": transit_depth_binned.tolist(),
            "transit_depth_err_ppm": transit_depth_err_binned.tolist(),
        },
        "lightcurve": {
            "phase": phase.tolist(),
            "flux": np.mean(flux_binned, axis=1).tolist(),
        },
        "metadata": {
            "instrument": "NIRSpec (simulated)",
            "mode": "G395H",
            "wavelength_range": [float(wavelengths.min()), float(wavelengths.max())],
            "n_integrations": n_times,
        },
    }


@router.get("/real-data/{target}")
async def get_real_transit_data(
    target: str,
    instrument: str = Query(default="NIRSPEC"),
):
    """
    Get real JWST transit spectroscopy data for a target.

    Searches MAST, downloads the first available observation,
    and returns parsed spectral data.
    """
    client = get_mast_client()
    loop = asyncio.get_event_loop()

    # Search for observations
    observations = await loop.run_in_executor(
        None,
        lambda: client.search_jwst_observations(target, instrument)
    )

    if not observations:
        raise HTTPException(
            status_code=404,
            detail=f"No {instrument} observations found for {target}"
        )

    # Get first observation
    obs = observations[0]

    # Download and parse
    fits_path = await loop.run_in_executor(
        None,
        lambda: client.download_product(obs.obs_id, "x1d")
    )

    if fits_path is None:
        raise HTTPException(
            status_code=404,
            detail=f"Could not download data for observation {obs.obs_id}"
        )

    try:
        spectrum = await loop.run_in_executor(
            None,
            lambda: client.parse_x1d_spectrum(fits_path)
        )

        # Convert to visualization format
        wavelengths = spectrum["wavelength"]
        flux = spectrum["flux"]

        # For single spectrum, create pseudo-transit depth
        # (In real usage, you'd combine in-transit and out-of-transit observations)
        median_flux = sum(flux) / len(flux)
        transit_depth_ppm = [(1 - f / median_flux) * 1e6 for f in flux]

        # Compute uncertainty from flux error
        flux_err = spectrum.get("flux_error", [0.01 * median_flux] * len(flux))
        transit_depth_err_ppm = [fe / median_flux * 1e6 for fe in flux_err]

        return {
            "target": target,
            "data_source": "mast",
            "obs_id": obs.obs_id,
            "wavelengths": wavelengths,
            "transmission_spectrum": {
                "wavelengths": wavelengths,
                "transit_depth_ppm": transit_depth_ppm,
                "transit_depth_err_ppm": transit_depth_err_ppm,
            },
            "raw_flux": flux,
            "flux_error": flux_err,
            "metadata": {
                **spectrum["metadata"],
                "proposal_id": obs.proposal_id,
                "exposure_time": obs.exposure_time,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing spectrum: {str(e)}")
