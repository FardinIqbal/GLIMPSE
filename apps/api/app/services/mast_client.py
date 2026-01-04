"""
MAST API client for accessing real JWST transit spectroscopy data.

Uses astroquery.mast for JWST data and aiohttp for exo.MAST API.
"""

import os
import json
import asyncio
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, asdict
import numpy as np
import aiohttp
import aiofiles

from astroquery.mast import Observations
from astropy.io import fits
from astropy.table import Table


# Cache directory for downloaded data
CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class ExoplanetInfo:
    """Exoplanet properties from exo.MAST."""
    name: str
    ra: float
    dec: float
    orbital_period: Optional[float] = None
    transit_duration: Optional[float] = None
    planet_radius: Optional[float] = None  # Jupiter radii
    star_radius: Optional[float] = None  # Solar radii
    equilibrium_temp: Optional[float] = None  # Kelvin
    distance: Optional[float] = None  # parsecs


@dataclass
class JWSTObservation:
    """JWST observation metadata."""
    obs_id: str
    target_name: str
    instrument: str
    filters: str
    grating: str
    exposure_time: float
    proposal_id: str
    obs_collection: str
    dataproduct_type: str
    calib_level: int
    t_min: float  # MJD start
    t_max: float  # MJD end


class MASTClient:
    """Client for accessing real JWST data from MAST archive."""

    # Molecular absorption bands (microns) - Colorblind-safe palette (Okabe-Ito)
    MOLECULAR_BANDS = {
        "H2O": {"color": "#0077BB", "ranges": [[1.35, 1.45], [1.8, 2.0], [2.6, 3.0], [5.5, 7.5]], "name": "Water"},
        "CO2": {"color": "#EE7733", "ranges": [[4.2, 4.4], [15.0, 16.0]], "name": "Carbon Dioxide"},
        "CO": {"color": "#CC3311", "ranges": [[4.5, 5.0]], "name": "Carbon Monoxide"},
        "CH4": {"color": "#009988", "ranges": [[2.2, 2.4], [3.2, 3.5], [7.5, 8.0]], "name": "Methane"},
        "SO2": {"color": "#EE3377", "ranges": [[7.3, 7.5], [8.5, 9.0]], "name": "Sulfur Dioxide"},
        "NH3": {"color": "#44BB99", "ranges": [[10.0, 11.0]], "name": "Ammonia"},
        "Na": {"color": "#BBBBBB", "ranges": [[0.589, 0.590]], "name": "Sodium"},
        "K": {"color": "#AA4499", "ranges": [[0.766, 0.770]], "name": "Potassium"},
    }

    # Known exoplanet transit programs with public data
    FEATURED_TARGETS = [
        # Hot Jupiters & Saturns (easiest to observe)
        {"name": "WASP-39 b", "search": "WASP-39", "proposal": "1366", "type": "Hot Saturn",
         "description": "First CO2 detection - ERS program", "features": ["H2O", "CO2", "SO2", "Na", "K"]},
        {"name": "WASP-96 b", "search": "WASP-96", "proposal": "2734", "type": "Hot Saturn",
         "description": "Clear atmosphere with water features", "features": ["H2O", "clouds"]},
        {"name": "WASP-17 b", "search": "WASP-17", "proposal": "1353", "type": "Hot Jupiter",
         "description": "Puffy planet with quartz clouds", "features": ["H2O", "SiO2"]},
        {"name": "WASP-69 b", "search": "WASP-69", "proposal": "2159", "type": "Hot Saturn",
         "description": "Water, CO2, and aerosols detected", "features": ["H2O", "CO2", "aerosols"]},
        {"name": "WASP-80 b", "search": "WASP-80", "proposal": "2639", "type": "Warm Jupiter",
         "description": "Methane-rich atmosphere", "features": ["CH4", "H2O"]},
        {"name": "HAT-P-18 b", "search": "HAT-P-18", "proposal": "2698", "type": "Hot Saturn",
         "description": "Warm Saturn with potential clouds", "features": ["H2O", "CH4"]},
        {"name": "HAT-P-26 b", "search": "HAT-P-26", "proposal": "2585", "type": "Warm Neptune",
         "description": "Low metallicity Neptune-mass planet", "features": ["H2O"]},

        # Sub-Neptunes (intermediate size)
        {"name": "K2-18 b", "search": "K2-18", "proposal": "2722", "type": "Sub-Neptune",
         "description": "Possible ocean world - CH4, CO2 detected", "features": ["CH4", "CO2", "H2O"]},
        {"name": "GJ 1214 b", "search": "GJ-1214", "proposal": "1803", "type": "Sub-Neptune",
         "description": "Archetype mini-Neptune with haze", "features": ["haze", "clouds"]},
        {"name": "TOI-270 d", "search": "TOI-270", "proposal": "2759", "type": "Sub-Neptune",
         "description": "Temperate sub-Neptune in multi-planet system", "features": ["H2O", "CH4"]},
        {"name": "GJ 9827 d", "search": "GJ-9827", "proposal": "2065", "type": "Super-Earth",
         "description": "Dense super-Earth with water vapor", "features": ["H2O"]},
        {"name": "GJ 3470 b", "search": "GJ-3470", "proposal": "1981", "type": "Sub-Neptune",
         "description": "Warm Neptune with escaping atmosphere", "features": ["H2O", "CH4"]},

        # Rocky planets (hardest to observe)
        {"name": "LHS 475 b", "search": "LHS-475", "proposal": "2512", "type": "Earth-sized",
         "description": "Nearby Earth-sized planet", "features": ["rocky"]},
        {"name": "TRAPPIST-1 b", "search": "TRAPPIST-1", "proposal": "1981", "type": "Earth-sized",
         "description": "Innermost TRAPPIST-1 planet", "features": ["rocky"]},
        {"name": "GJ 486 b", "search": "GJ-486", "proposal": "1743", "type": "Super-Earth",
         "description": "Hot rocky super-Earth", "features": ["rocky", "H2O?"]},
    ]

    def __init__(self):
        self.exomast_base = "https://exo.mast.stsci.edu/api/v0.1"

    async def get_exoplanet_info(self, planet_name: str) -> Optional[ExoplanetInfo]:
        """Fetch exoplanet properties from exo.MAST API."""
        # Clean planet name for API
        clean_name = planet_name.replace(" ", "%20")
        url = f"{self.exomast_base}/exoplanets/{clean_name}/properties/"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as resp:
                    if resp.status != 200:
                        return None
                    data = await resp.json()

                    if not data:
                        return None

                    # Parse the first result
                    props = data[0] if isinstance(data, list) else data

                    return ExoplanetInfo(
                        name=planet_name,
                        ra=float(props.get("ra", 0)),
                        dec=float(props.get("dec", 0)),
                        orbital_period=props.get("orbital_period"),
                        transit_duration=props.get("transit_duration"),
                        planet_radius=props.get("Rp"),
                        star_radius=props.get("Rs"),
                        equilibrium_temp=props.get("Tep"),
                        distance=props.get("distance"),
                    )
        except Exception as e:
            print(f"Error fetching exoplanet info: {e}")
            return None

    def search_jwst_observations(
        self,
        target: str,
        instrument: str = "NIRSPEC",
        radius: float = 0.02,  # degrees
    ) -> list[JWSTObservation]:
        """
        Search for JWST spectroscopy observations of a target.

        Args:
            target: Target name (e.g., "WASP-39")
            instrument: JWST instrument (NIRSPEC, MIRI, NIRISS)
            radius: Search radius in degrees

        Returns:
            List of matching observations
        """
        try:
            # Query MAST for JWST observations
            # Note: instrument names are like "NIRSPEC/SLIT", not just "NIRSPEC"
            # Transit spectroscopy data is stored as "timeseries", not "spectrum"
            obs_table = Observations.query_criteria(
                obs_collection="JWST",
                instrument_name=f"{instrument}*",  # Match NIRSPEC/SLIT, etc.
                target_name=f"*{target}*",
                intentType="science",
            )

            if obs_table is None or len(obs_table) == 0:
                return []

            observations = []
            colnames = obs_table.colnames
            for row in obs_table:
                try:
                    # Helper to safely get column value
                    def get_col(name, default=""):
                        return str(row[name]) if name in colnames else default

                    def get_col_float(name, default=0.0):
                        if name not in colnames:
                            return default
                        val = row[name]
                        try:
                            f = float(val)
                            # Handle NaN and Inf values
                            if np.isnan(f) or np.isinf(f):
                                return default
                            return f
                        except (ValueError, TypeError):
                            return default

                    def get_col_int(name, default=0):
                        if name not in colnames:
                            return default
                        try:
                            return int(row[name])
                        except (ValueError, TypeError):
                            return default

                    obs = JWSTObservation(
                        obs_id=get_col("obs_id"),
                        target_name=get_col("target_name"),
                        instrument=get_col("instrument_name"),
                        filters=get_col("filters"),
                        grating=get_col("grating") or get_col("filters"),
                        exposure_time=get_col_float("t_exptime"),
                        proposal_id=get_col("proposal_id"),
                        obs_collection=get_col("obs_collection"),
                        dataproduct_type=get_col("dataproduct_type"),
                        calib_level=get_col_int("calib_level"),
                        t_min=get_col_float("t_min"),
                        t_max=get_col_float("t_max"),
                    )
                    observations.append(obs)
                except Exception as e:
                    print(f"Error parsing observation: {e}")
                    continue

            # Sort by calibration level (prefer higher) and observation time
            observations.sort(key=lambda x: (-x.calib_level, x.t_min))

            return observations

        except Exception as e:
            print(f"Error searching MAST: {e}")
            return []

    def get_observation_products(self, obs_id: str) -> list[dict]:
        """Get downloadable data products for an observation."""
        try:
            # Get observation by ID
            obs_table = Observations.query_criteria(obs_id=obs_id)
            if obs_table is None or len(obs_table) == 0:
                return []

            # Get associated data products
            products = Observations.get_product_list(obs_table)

            if products is None or len(products) == 0:
                return []

            # Filter for science products
            # x1dints = 1D extracted spectra for time-series (transit)
            # x1d = standard 1D extracted spectra
            # s2d = 2D spectra
            colnames = products.colnames
            result = []
            for row in products:
                product_type = str(row["productSubGroupDescription"]) if "productSubGroupDescription" in colnames else ""
                filename = str(row["productFilename"]) if "productFilename" in colnames else ""

                # We want x1dints (for TSO), x1d, or s2d spectra - but only FITS files
                if filename.endswith('.fits') and any(k in filename.lower() for k in ['x1dints', 'x1d', 's2d']):
                    size = 0
                    if "size" in colnames:
                        try:
                            size = int(row["size"])
                        except (ValueError, TypeError):
                            pass

                    result.append({
                        "filename": filename,
                        "product_type": product_type,
                        "size": size,
                        "uri": str(row["dataURI"]) if "dataURI" in colnames else "",
                    })

            return result

        except Exception as e:
            print(f"Error getting products: {e}")
            return []

    def download_product(self, obs_id: str, product_filter: str = "x1dints") -> Optional[Path]:
        """
        Download a data product for an observation.

        Args:
            obs_id: Observation ID
            product_filter: Filter for product type (x1dints for TSO, x1d, s2d)

        Returns:
            Path to downloaded file, or None if failed
        """
        cache_path = CACHE_DIR / obs_id
        cache_path.mkdir(parents=True, exist_ok=True)

        # Check if already cached - try both x1dints and x1d
        for pattern in [product_filter, "x1dints", "x1d"]:
            existing = list(cache_path.glob(f"**/*{pattern}*.fits"))
            if existing:
                return existing[0]

        try:
            # Get observation
            obs_table = Observations.query_criteria(obs_id=obs_id)
            if obs_table is None or len(obs_table) == 0:
                return None

            # Get products
            products = Observations.get_product_list(obs_table)
            if products is None or len(products) == 0:
                return None

            # Try multiple product types in preference order
            colnames = products.colnames
            for prod_type in [product_filter.upper(), "X1DINTS", "X1D"]:
                # Filter for desired product type
                filtered = Observations.filter_products(
                    products,
                    productSubGroupDescription=prod_type,
                )

                if filtered is not None and len(filtered) > 0:
                    break

            if filtered is None or len(filtered) == 0:
                # Try filtering by filename as fallback
                matching = []
                for p in products:
                    filename = str(p["productFilename"]) if "productFilename" in colnames else ""
                    if product_filter.lower() in filename.lower() and filename.endswith('.fits'):
                        matching.append(p)
                if not matching:
                    return None
                filtered = Table(rows=matching)

            # Download
            manifest = Observations.download_products(
                filtered[:1],  # Just first matching product
                download_dir=str(cache_path),
            )

            if manifest is None or len(manifest) == 0:
                return None

            # Return path to downloaded file
            for pattern in [product_filter, "x1dints", "x1d"]:
                downloaded = list(cache_path.glob(f"**/*{pattern}*.fits"))
                if downloaded:
                    return downloaded[0]
            return None

        except Exception as e:
            print(f"Error downloading product: {e}")
            return None

    def parse_x1d_spectrum(self, fits_path: Path) -> dict:
        """
        Parse a JWST x1d or x1dints (1D extracted spectrum) FITS file.

        For x1dints files (time-series), averages across all integrations.
        Returns wavelength, flux, and error arrays.
        """
        with fits.open(fits_path) as hdul:
            # Find EXTRACT1D extension
            data = None
            for hdu in hdul:
                if hdu.name == "EXTRACT1D":
                    if hasattr(hdu, "data") and hdu.data is not None:
                        data = hdu.data
                        break

            if data is None:
                raise ValueError("No EXTRACT1D extension found in FITS file")

            # Get column names (case-insensitive)
            col_names = [c.upper() for c in data.dtype.names] if hasattr(data.dtype, 'names') else []

            # Check if this is x1dints (time-series) or standard x1d
            # x1dints has 2D arrays per column (each row is an integration)
            is_time_series = False
            wavelength_col = None
            flux_col = None

            for name in ["WAVELENGTH", "WAVE", "LAMBDA"]:
                if name in col_names:
                    wavelength_col = name
                    # Check if it's 2D (time-series)
                    if len(data[name].shape) > 1 or (len(data) > 1 and hasattr(data[name][0], '__len__')):
                        is_time_series = True
                    break

            for name in ["FLUX", "SURF_BRIGHT", "SB"]:
                if name in col_names:
                    flux_col = name
                    break

            if wavelength_col is None or flux_col is None:
                raise ValueError(f"Missing wavelength or flux. Found columns: {col_names}")

            if is_time_series:
                # x1dints: Average across integrations
                # Each row has wavelength and flux arrays
                wavelength = np.array(data[wavelength_col][0])  # Same for all integrations
                flux_all = np.array([row for row in data[flux_col]])

                # Calculate mean flux across integrations, ignoring NaN
                flux = np.nanmean(flux_all, axis=0)

                # Calculate error as std across integrations
                flux_err = np.nanstd(flux_all, axis=0) / np.sqrt(np.sum(~np.isnan(flux_all), axis=0))
            else:
                # Standard x1d: Simple 1D arrays
                wavelength = data[wavelength_col]
                flux = data[flux_col]

                flux_err = None
                for name in ["FLUX_ERROR", "ERR", "ERROR", "SURF_BRIGHT_ERR", "SB_ERR"]:
                    if name in col_names:
                        flux_err = data[name]
                        break

            # Clean up NaN and Inf values
            valid_mask = np.isfinite(flux) & np.isfinite(wavelength)
            wavelength = wavelength[valid_mask]
            flux = flux[valid_mask]
            if flux_err is not None:
                flux_err = flux_err[valid_mask]

            # Get metadata
            primary = hdul[0].header
            metadata = {
                "instrument": primary.get("INSTRUME", "UNKNOWN"),
                "detector": primary.get("DETECTOR", ""),
                "filter": primary.get("FILTER", ""),
                "grating": primary.get("GRATING", primary.get("FILTER", "")),
                "target": primary.get("TARGNAME", ""),
                "program": primary.get("PROGRAM", primary.get("PROPOSID", "")),
                "obs_id": primary.get("OBS_ID", ""),
                "date_obs": primary.get("DATE-OBS", ""),
                "n_integrations": len(data) if is_time_series else 1,
            }

            return {
                "wavelength": wavelength.tolist() if hasattr(wavelength, 'tolist') else list(wavelength),
                "flux": flux.tolist() if hasattr(flux, 'tolist') else list(flux),
                "flux_error": flux_err.tolist() if flux_err is not None and hasattr(flux_err, 'tolist') else None,
                "metadata": metadata,
            }

    async def get_published_spectrum(self, planet_name: str) -> Optional[dict]:
        """
        Get published transmission spectrum from exo.MAST STATES database.
        """
        clean_name = planet_name.replace(" ", "%20")
        url = f"{self.exomast_base}/spectra/{clean_name}/"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=15) as resp:
                    if resp.status != 200:
                        return None

                    data = await resp.json()
                    if not data or "spectra" not in data:
                        return None

                    spectra = data["spectra"]
                    if not spectra:
                        return None

                    # Return first available spectrum
                    return {
                        "available": True,
                        "count": len(spectra),
                        "spectra": spectra[:5],  # First 5
                    }

        except Exception as e:
            print(f"Error fetching published spectrum: {e}")
            return None

    def get_molecular_bands(self) -> dict:
        """Return molecular absorption band definitions."""
        return self.MOLECULAR_BANDS

    def get_featured_targets(self) -> list[dict]:
        """Return list of featured exoplanet targets."""
        return self.FEATURED_TARGETS


# Singleton instance
_client: Optional[MASTClient] = None


def get_mast_client() -> MASTClient:
    global _client
    if _client is None:
        _client = MASTClient()
    return _client
