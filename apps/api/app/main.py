import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import upload, spectra, mast

app = FastAPI(
    title="GLIMPSE API",
    description="Getting Light IMprints from Planetary Spectral Emissions - JWST Transit Spectroscopy API",
    version="1.0.0",
)

# Allow localhost for dev, plus any Vercel preview/production URLs
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3005",
    "http://127.0.0.1:3005",
]

# Add production frontend URL from environment
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

# Allow all Vercel preview deployments
allowed_origins.append("https://*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "name": "GLIMPSE API",
        "description": "JWST Transit Spectroscopy API",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(spectra.router, prefix="/api/spectra", tags=["spectra"])
app.include_router(mast.router, prefix="/api/mast", tags=["mast"])
