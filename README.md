# AstroSpecVis

Interactive visualization of JWST spectral time-series data.

## Architecture

```
apps/
  web/     Next.js 14 frontend (React, Three.js, Tailwind)
  api/     FastAPI backend (Python, Astropy, NumPy)
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+

### Setup

```bash
# Install root dependencies
npm install

# Install frontend
cd apps/web && npm install

# Install backend
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Development

Run both frontend and backend:

```bash
npm run dev
```

Or run separately:

```bash
# Frontend (http://localhost:3000)
cd apps/web && npm run dev

# Backend (http://localhost:8000)
cd apps/api && source .venv/bin/activate && uvicorn app.main:app --reload
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload/` | POST | Upload FITS file |
| `/api/upload/list` | GET | List uploaded files |
| `/api/spectra/{id}` | GET | Get processed spectral data |
| `/api/spectra/{id}/variability` | GET | Get variability map data |
| `/api/spectra/{id}/lightcurve` | GET | Get light curve for wavelength |

## Stack

**Frontend**
- Next.js 14 (App Router)
- React Three Fiber + Three.js
- Tailwind CSS
- Framer Motion

**Backend**
- FastAPI
- Astropy (FITS parsing)
- NumPy / SciPy (data processing)

## Data Format

Supports JWST FITS files containing:
- Flux arrays (2D: wavelength x time)
- Wavelength arrays
- Time arrays (MJD)

Compatible with NIRSpec and MIRI spectral products.
