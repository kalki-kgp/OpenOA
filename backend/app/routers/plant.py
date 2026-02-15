from __future__ import annotations

import math

import numpy as np
from fastapi import APIRouter

from backend.app.schemas import PlantSummaryResponse, TurbineInfo
from backend.app.services.plant_loader import get_plant


router = APIRouter(prefix="/api/plant", tags=["plant"])


def _safe_float(value: float | int | None) -> float | None:
    if value is None:
        return None
    if isinstance(value, (float, np.floating)) and (math.isnan(value) or math.isinf(value)):
        return None
    return float(value)


@router.get("/summary", response_model=PlantSummaryResponse)
def get_plant_summary() -> PlantSummaryResponse:
    plant = get_plant()
    scada_time = plant.scada.index.get_level_values("time")
    avg_ws = float(plant.scada["WMET_HorWdSpd"].mean())

    return PlantSummaryResponse(
        name="La Haute Borne",
        capacity_mw=float(plant.metadata.capacity),
        turbine_count=int(plant.n_turbines),
        date_start=scada_time.min().to_pydatetime(),
        date_end=scada_time.max().to_pydatetime(),
        latitude=float(plant.metadata.latitude),
        longitude=float(plant.metadata.longitude),
        avg_wind_speed_ms=avg_ws,
    )


@router.get("/turbines", response_model=list[TurbineInfo])
def get_turbines() -> list[TurbineInfo]:
    plant = get_plant()
    turbines = plant.asset.loc[plant.asset["type"] == "turbine"]

    result: list[TurbineInfo] = []
    for turbine_id, row in turbines.iterrows():
        result.append(
            TurbineInfo(
                turbine_id=str(turbine_id),
                latitude=_safe_float(row.get("latitude")),
                longitude=_safe_float(row.get("longitude")),
                hub_height_m=_safe_float(row.get("hub_height")),
                rotor_diameter_m=_safe_float(row.get("rotor_diameter")),
                rated_power_mw=_safe_float(row.get("rated_power")),
            )
        )

    return result
