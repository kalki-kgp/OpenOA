from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.routers.analysis import router as analysis_router
from backend.app.routers.data import router as data_router
from backend.app.routers.plant import router as plant_router
from backend.app.services.plant_loader import is_plant_loaded, load_plant


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await asyncio.to_thread(load_plant)
    except Exception:
        # App still starts, /api/health will report plant_loaded=false and endpoint errors carry detail.
        pass
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> dict[str, bool | str]:
    return {"status": "ok", "plant_loaded": is_plant_loaded()}


app.include_router(plant_router)
app.include_router(data_router)
app.include_router(analysis_router)
