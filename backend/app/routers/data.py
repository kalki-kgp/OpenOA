from __future__ import annotations

import math
from datetime import datetime

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from backend.app.config import settings
from backend.app.schemas import (
    MonthlyEnergyPoint,
    MonthlyEnergyResponse,
    ScadaPoint,
    ScadaResponse,
    WindRoseResponse,
    WindRoseSector,
)
from backend.app.services.plant_loader import get_plant


router = APIRouter(prefix="/api/data", tags=["data"])


def _safe_float(value: float | int | None) -> float | None:
    if value is None:
        return None
    if isinstance(value, (float, np.floating)) and (math.isnan(value) or math.isinf(value)):
        return None
    return float(value)


def _parse_speed_bins(speed_bins: str) -> list[float]:
    try:
        values = sorted({float(value.strip()) for value in speed_bins.split(",") if value.strip()})
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid speed_bins parameter") from exc

    if len(values) < 2:
        raise HTTPException(status_code=400, detail="speed_bins requires at least two values")
    return values


@router.get("/scada", response_model=ScadaResponse)
def get_scada(
    turbine_id: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    resample: str = Query(default="1h"),
) -> ScadaResponse:
    plant = get_plant()

    if turbine_id:
        if turbine_id not in set(plant.turbine_ids):
            raise HTTPException(status_code=404, detail=f"Unknown turbine_id: {turbine_id}")
        df = plant.turbine_df(turbine_id).copy()
    else:
        df = (
            plant.scada.groupby(level="time")
            .agg(
                {
                    "WTUR_W": "sum",
                    "WMET_HorWdSpd": "mean",
                    "WMET_HorWdDir": "mean",
                    "WMET_EnvTmp": "mean",
                }
            )
            .copy()
        )

    if start is not None:
        df = df.loc[df.index >= pd.Timestamp(start)]
    if end is not None:
        df = df.loc[df.index <= pd.Timestamp(end)]

    try:
        df = df.resample(resample).mean(numeric_only=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid resample frequency: {resample}") from exc

    df = df[["WTUR_W", "WMET_HorWdSpd", "WMET_HorWdDir", "WMET_EnvTmp"]].dropna(how="all")

    if len(df) > settings.scada_max_points:
        step = math.ceil(len(df) / settings.scada_max_points)
        df = df.iloc[::step]

    points = [
        ScadaPoint(
            time=index.to_pydatetime(),
            power_kw=_safe_float(row["WTUR_W"]),
            wind_speed_ms=_safe_float(row["WMET_HorWdSpd"]),
            wind_direction_deg=_safe_float(row["WMET_HorWdDir"]),
            temperature_c=_safe_float(row["WMET_EnvTmp"]),
        )
        for index, row in df.iterrows()
    ]

    return ScadaResponse(turbine_id=turbine_id, resample=resample, points=points)


@router.get("/wind-rose", response_model=WindRoseResponse)
def get_wind_rose(
    turbine_id: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    direction_bins: int = Query(default=12, ge=6, le=72),
    speed_bins: str = Query(default="0,3,6,9,12,15,25"),
) -> WindRoseResponse:
    plant = get_plant()

    if turbine_id:
        if turbine_id not in set(plant.turbine_ids):
            raise HTTPException(status_code=404, detail=f"Unknown turbine_id: {turbine_id}")
        df = plant.turbine_df(turbine_id)[["WMET_HorWdDir", "WMET_HorWdSpd"]].copy()
    else:
        df = (
            plant.scada.groupby(level="time")
            .agg({"WMET_HorWdDir": "mean", "WMET_HorWdSpd": "mean"})
            .copy()
        )

    if start is not None:
        df = df.loc[df.index >= pd.Timestamp(start)]
    if end is not None:
        df = df.loc[df.index <= pd.Timestamp(end)]

    df = df.dropna(subset=["WMET_HorWdDir", "WMET_HorWdSpd"])
    if df.empty:
        raise HTTPException(status_code=404, detail="No wind data found for requested filters")

    speed_edges = _parse_speed_bins(speed_bins)
    direction_edges = np.linspace(0, 360, direction_bins + 1)

    directions = np.mod(df["WMET_HorWdDir"].to_numpy(), 360.0)
    speeds = df["WMET_HorWdSpd"].to_numpy()

    hist, _, _ = np.histogram2d(directions, speeds, bins=[direction_edges, speed_edges])
    total_samples = float(hist.sum())

    sectors: list[WindRoseSector] = []
    for index in range(direction_bins):
        direction_start = direction_edges[index]
        direction_end = direction_edges[index + 1]
        center = (direction_start + direction_end) / 2
        counts = hist[index, :].tolist()
        sector_total = float(np.sum(counts))
        sectors.append(
            WindRoseSector(
                direction_center_deg=float(center),
                counts=[float(value) for value in counts],
                total=sector_total,
                frequency=(sector_total / total_samples) if total_samples else 0.0,
            )
        )

    return WindRoseResponse(
        turbine_id=turbine_id,
        direction_bin_size_deg=float(360 / direction_bins),
        speed_bins_ms=[float(edge) for edge in speed_edges],
        sectors=sectors,
    )


@router.get("/monthly-energy", response_model=MonthlyEnergyResponse)
def get_monthly_energy() -> MonthlyEnergyResponse:
    plant = get_plant()

    monthly = plant.meter["MMTR_SupWh"].resample("MS").sum() / 1000.0
    monthly = monthly.dropna()

    points = [
        MonthlyEnergyPoint(month=timestamp.to_pydatetime(), energy_mwh=float(value))
        for timestamp, value in monthly.items()
    ]
    return MonthlyEnergyResponse(points=points)
