"""Plant info endpoints."""

import pandas as pd
from fastapi import APIRouter, HTTPException

from app.schemas import PlantSummary, TurbineInfo
from app.services.plant_loader import get_plant

router = APIRouter()


@router.get("/summary", response_model=PlantSummary)
async def get_plant_summary():
    """Get plant overview summary."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=503, detail="Plant data not loaded")

    scada = plant.scada
    if scada is None or scada.empty:
        raise HTTPException(status_code=503, detail="SCADA data not available")

    if hasattr(scada.index, "get_level_values") and "time" in (scada.index.names or []):
        date_range = scada.index.get_level_values("time")
    elif "time" in scada.columns:
        date_range = scada["time"]
    else:
        date_range = scada.reset_index()["time"] if "time" in scada.reset_index().columns else scada.index
    date_range = date_range.dropna()
    if date_range.empty:
        raise HTTPException(status_code=503, detail="No valid timestamps in SCADA")

    return PlantSummary(
        name="La Haute Borne",
        capacity_mw=8.2,
        turbine_count=len(plant.turbine_ids),
        date_range_start=date_range.min(),
        date_range_end=date_range.max(),
        latitude=48.4497,
        longitude=5.5896,
    )


@router.get("/turbines", response_model=list[TurbineInfo])
async def get_turbines():
    """Get turbine asset information."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=503, detail="Plant data not loaded")

    asset = plant.asset
    if asset is None or asset.empty:
        raise HTTPException(status_code=503, detail="Asset data not available")

    def _get(row, *keys):
        for k in keys:
            if k in row.index and pd.notna(row.get(k)):
                v = row[k]
                return float(v) if isinstance(v, (int, float)) else v
        return 0.0

    turbines = []
    for idx, row in asset.iterrows():
        aid = str(idx) if isinstance(idx, (str, int)) else str(row.get("asset_id", row.get("Wind_turbine_name", "unknown")))
        rated = _get(row, "rated_power", "Rated_power")
        if rated < 100:  # Assume MW if small
            rated *= 1000
        turbines.append(
            TurbineInfo(
                asset_id=aid,
                latitude=_get(row, "latitude", "Latitude"),
                longitude=_get(row, "longitude", "Longitude"),
                elevation=_get(row, "elevation", "elevation_m"),
                hub_height=_get(row, "hub_height", "Hub_height_m"),
                rotor_diameter=_get(row, "rotor_diameter", "Rotor_diameter_m"),
                rated_power=rated,
                type="turbine",
            )
        )
    return turbines
