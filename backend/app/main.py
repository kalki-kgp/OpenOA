"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import analysis, data, plant
from app.services.plant_loader import load_plant


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load plant data on startup."""
    try:
        load_plant()
        yield
    finally:
        pass


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plant.router, prefix="/api/plant", tags=["plant"])
app.include_router(data.router, prefix="/api/data", tags=["data"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    from app.services.plant_loader import is_loaded

    return {"status": "ok", "plant_loaded": is_loaded()}
