# GLIMPSE

**Getting Light IMprints from Planetary Spectral Emissions**

An interactive visualization tool for exploring James Webb Space Telescope (JWST) exoplanet transit spectroscopy data. GLIMPSE makes cutting-edge astronomical data accessible through intuitive visualizations.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://glimpse-jwst.vercel.app)
[![API Status](https://img.shields.io/badge/api-online-brightgreen)](https://astrospecvis.onrender.com)

---

## Table of Contents

- [Overview](#overview)
- [Scientific Background](#scientific-background)
  - [Transit Spectroscopy](#transit-spectroscopy)
  - [Transmission Spectra](#transmission-spectra)
  - [Molecular Detection](#molecular-detection)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

GLIMPSE provides an interactive interface for exploring atmospheric data from confirmed exoplanets observed by JWST. Users can:

- Browse a curated catalog of exoplanets with transit spectroscopy data
- Visualize transmission spectra with molecular absorption features
- Explore spectral time series and light curves
- Toggle molecular band overlays (H2O, CO2, CO, CH4, SO2, etc.)
- Export data in CSV, JSON, or PNG formats

---

## Scientific Background

### Transit Spectroscopy

When an exoplanet passes in front of its host star (a **transit**), a small fraction of the starlight filters through the planet's atmosphere. Different molecules in the atmosphere absorb light at specific wavelengths, creating a unique spectral fingerprint.

```
                    +-------------------+
                    |                   |
      Star ---------+   Atmosphere      +----------> Observer
                    |    +-------+      |
                    |    |Planet |      |
                    |    +-------+      |
                    +-------------------+
                           |
                    Light passes through
                    atmosphere during transit
```

JWST's NIRSpec and NIRISS instruments observe these transits in the near-infrared (0.6-5.3 um), where many important molecules have strong absorption features.

### Transmission Spectra

A **transmission spectrum** plots the apparent size of the planet (measured as **transit depth** in parts per million, ppm) against wavelength. At wavelengths where atmospheric molecules absorb starlight, the planet appears slightly larger because the atmosphere becomes opaque higher up.

Key parameters:
- **Transit Depth**: `d = (Rp/R*)^2` - the fraction of starlight blocked
- **Scale Height**: `H = kT/ug` - characteristic atmospheric thickness
- **Feature Amplitude**: Typically 10-1000 ppm for gas giants, 1-100 ppm for terrestrial planets

### Molecular Detection

Each molecule has characteristic absorption bands:

| Molecule | Key Wavelengths (um) | Significance |
|----------|---------------------|--------------|
| H2O | 1.4, 1.9, 2.7 | Habitability indicator |
| CO2 | 4.3, 15.0 | Carbon cycle, greenhouse |
| CO | 2.3, 4.6 | Atmospheric chemistry |
| CH4 | 2.3, 3.3, 7.7 | Biosignature candidate |
| SO2 | 4.0, 7.3, 8.7 | Volcanic activity |
| NH3 | 1.5, 2.0, 10.5 | Nitrogen chemistry |
| Na/K | 0.59, 0.77 | Alkali metals in hot atmospheres |

GLIMPSE overlays these molecular bands on transmission spectra, helping users identify which molecules may be present in an exoplanet's atmosphere.

---

## Features

### Data Visualization
- **Transmission Spectrum**: Interactive plot with error bars and molecular band overlays
- **Spectral Time Series**: 2D heatmap showing flux variation across wavelength and orbital phase
- **Light Curves**: Transit light curves at selected wavelengths

### Data Sources
- **Demo Mode**: Simulated transit data based on real JWST observations
- **MAST Mode**: Live data from the Mikulski Archive for Space Telescopes

### Controls
- Spectral binning (5-100 points)
- Molecular band toggles
- Data export (CSV, JSON, PNG)

### Accessibility
- WCAG 2.1 AA compliant
- Screen reader support with ARIA labels
- Keyboard navigation
- Skip links

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Charts**: HTML5 Canvas (custom implementation)
- **Language**: TypeScript

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11
- **Scientific Libraries**:
  - `astropy` - FITS file handling, coordinate transforms
  - `astroquery` - MAST archive queries
  - `numpy` / `scipy` - Numerical computation

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render
- **Data Source**: MAST Archive (STScI)

---

## Architecture

```
+-------------------------------------------------------------+
|                         Frontend                             |
|                     (Next.js on Vercel)                      |
|  +-------------+  +-------------+  +---------------------+   |
|  |   Target    |  | Transmission|  |    Spectrogram /    |   |
|  |  Selector   |  |  Spectrum   |  |    Light Curve      |   |
|  +-------------+  +-------------+  +---------------------+   |
+-----------------------------+-------------------------------+
                              | HTTPS
                              v
+-------------------------------------------------------------+
|                          Backend                             |
|                    (FastAPI on Render)                       |
|  +-------------+  +-------------+  +---------------------+   |
|  |   /api/     |  |   /api/     |  |      /api/          |   |
|  |   mast/     |  |  spectra/   |  |     upload/         |   |
|  |  targets    |  |             |  |                     |   |
|  +------+------+  +-------------+  +---------------------+   |
+---------+---------------------------------------------------+
          |
          v
+-------------------------------------------------------------+
|                      MAST Archive                            |
|                        (STScI)                               |
|         JWST NIRSpec / NIRISS Transit Observations           |
+-------------------------------------------------------------+
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/FardinIqbal/GLIMPSE.git
cd GLIMPSE

# Install frontend dependencies
cd apps/web
pnpm install

# Install backend dependencies
cd ../api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Running Locally

```bash
# Terminal 1: Start the backend
cd apps/api
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Start the frontend
cd apps/web
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Reference

### Base URL
- **Production**: `https://astrospecvis.onrender.com`
- **Local**: `http://localhost:8000`

### Endpoints

#### `GET /`
Health check and API info.

#### `GET /api/mast/targets`
Returns list of available exoplanet targets.

```json
{
  "targets": [
    {
      "name": "WASP-39 b",
      "type": "Hot Saturn",
      "features": ["Water", "Carbon Dioxide", "Sulfur Dioxide"],
      "proposal": "ERS-1366",
      "description": "Benchmark hot Saturn with detailed atmospheric characterization"
    }
  ]
}
```

#### `GET /api/mast/demo-data/{target}`
Returns simulated transit data for a target.

Query parameters:
- `bin_size` (int): Spectral binning factor (default: 20)

#### `GET /api/mast/real-data/{target}`
Returns real JWST data from MAST archive.

#### `GET /api/mast/exoplanet/{target}`
Returns planetary parameters from NASA Exoplanet Archive.

#### `GET /api/mast/molecular-bands`
Returns molecular absorption band definitions.

---

## Deployment

### Frontend (Vercel)

```bash
cd apps/web
vercel --prod
```

Set environment variable:
- `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `https://astrospecvis.onrender.com`)

### Backend (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `apps/api`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free

Or use the included `render.yaml` for Blueprint deployment.

---

## Data Attribution

- Transit spectroscopy data from [MAST Archive](https://mast.stsci.edu) (STScI)
- Planetary parameters from [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu)
- JWST is operated by STScI for NASA, ESA, and CSA

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- JWST Early Release Science Program 1366 (WASP-39 b)
- The astronomical Python community (astropy, astroquery)
- Space Telescope Science Institute
