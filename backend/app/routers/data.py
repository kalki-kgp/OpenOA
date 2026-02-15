"""Data endpoints - SCADA, wind rose, monthly energy."""

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from app.services.plant_loader import get_plant

router = APIRouter()


def _get_scada_df(plant):
    """Get SCADA dataframe with columns resolved. Handles MultiIndex."""
    scada = plant.scada
    if scada is None:
        return None, None

    df = scada.copy()
    if hasattr(df.index, "names") and "time" in (df.index.names or []):
        df = df.reset_index()

    # OpenOA uses IEC-25 names after validation
    col_map = {
        "power": ["WTUR_W", "P_avg"],
        "wind_speed": ["WMET_HorWdSpd", "Ws_avg"],
        "wind_direction": ["WMET_HorWdDir", "Wa_avg"],
        "temperature": ["WMET_EnvTmp", "Ot_avg"],
        "energy": ["WTUR_SupWh", "energy_kwh"],
        "time": ["time", "Date_time"],
        "asset_id": ["asset_id", "Wind_turbine_name"],
    }
    resolved = {}
    for key, candidates in col_map.items():
        for c in candidates:
            if c in df.columns:
                resolved[key] = c
                break
    return df, resolved


@router.get("/scada")
async def get_scada_data(
    turbine_id: str | None = Query(None, description="Filter by turbine ID"),
    start: datetime | None = Query(None, description="Start of date range"),
    end: datetime | None = Query(None, description="End of date range"),
    resample: Literal["10min", "1h", "1D"] = Query("1h", description="Resample interval"),
):
    """Get SCADA time series data with optional resampling."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=503, detail="Plant data not loaded")

    df, cols = _get_scada_df(plant)
    if df is None or not cols:
        raise HTTPException(status_code=503, detail="SCADA data not available")

    time_col = cols["time"]
    df[time_col] = df[time_col].astype("datetime64[ns]")

    if turbine_id:
        asset_col = cols["asset_id"]
        df = df[df[asset_col] == turbine_id]

    if start:
        df = df[df[time_col] >= start]
    if end:
        df = df[df[time_col] <= end]

    # Resample
    df = df.set_index(time_col)
    resample_map = {"10min": "10min", "1h": "1h", "1D": "1D"}
    freq = resample_map.get(resample, "1h")
    df = df.resample(freq).mean().dropna(how="all").reset_index()

    # Limit rows for API response
    df = df.tail(2000)

    result = []
    for _, row in df.iterrows():
        point = {"time": str(row[time_col])}
        if "power" in cols:
            point["power_kw"] = float(row[cols["power"]]) if cols["power"] in row else None
        if "wind_speed" in cols:
            point["wind_speed"] = float(row[cols["wind_speed"]]) if cols["wind_speed"] in row else None
        if "wind_direction" in cols:
            point["wind_direction"] = float(row[cols["wind_direction"]]) if cols["wind_direction"] in row else None
        if "temperature" in cols:
            point["temperature"] = float(row[cols["temperature"]]) if cols["temperature"] in row else None
        if "energy" in cols:
            point["energy_kwh"] = float(row[cols["energy"]]) if cols["energy"] in row else None
        result.append(point)

    return {"data": result}


@router.get("/wind-rose")
async def get_wind_rose(turbine_id: str | None = Query(None)):
    """Get binned wind direction/speed data for wind rose chart."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=503, detail="Plant data not loaded")

    df, cols = _get_scada_df(plant)
    if df is None or "wind_speed" not in cols or "wind_direction" not in cols:
        raise HTTPException(status_code=503, detail="SCADA data not available")

    if turbine_id:
        asset_col = cols["asset_id"]
        df = df[df[asset_col] == turbine_id]

    ws_col = cols["wind_speed"]
    wd_col = cols["wind_direction"]
    df = df[[ws_col, wd_col]].dropna()

    # Bin: 16 direction bins (22.5 deg each), 4 speed bins
    import numpy as np

    dir_bins = np.arange(0, 361, 22.5)
    speed_bins = [0, 3, 6, 10, 15, 100]

    df["dir_bin"] = np.digitize(df[wd_col], dir_bins) - 1
    df["dir_bin"] = df["dir_bin"].clip(0, 15)
    df["speed_bin"] = np.digitize(df[ws_col], speed_bins) - 1
    df["speed_bin"] = df["speed_bin"].clip(0, len(speed_bins) - 2)

    bins = []
    for (db, sb), grp in df.groupby(["dir_bin", "speed_bin"]):
        direction_center = (db + 0.5) * 22.5
        speed_min = speed_bins[sb]
        speed_max = speed_bins[sb + 1]
        bins.append(
            {
                "direction_center": float(direction_center),
                "speed_min": float(speed_min),
                "speed_max": float(speed_max),
                "frequency": float(len(grp) / len(df)),
                "count": int(len(grp)),
            }
        )

    return {"bins": bins}


@router.get("/monthly-energy")
async def get_monthly_energy(turbine_id: str | None = Query(None)):
    """Get monthly energy production aggregated from SCADA."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=503, detail="Plant data not loaded")

    df, cols = _get_scada_df(plant)
    if df is None:
        raise HTTPException(status_code=503, detail="SCADA data not available")

    time_col = cols["time"]
    df[time_col] = df[time_col].astype("datetime64[ns]")

    if turbine_id:
        asset_col = cols["asset_id"]
        df = df[df[asset_col] == turbine_id]

    energy_col = cols.get("energy")
    if not energy_col or energy_col not in df.columns:
        # Estimate from power if energy not available
        power_col = cols.get("power")
        if power_col:
            df["_energy"] = df[power_col] * (10 / 60)  # 10-min intervals, kW to kWh
            energy_col = "_energy"
        else:
            raise HTTPException(status_code=503, detail="No energy or power column available")

    df["month"] = df[time_col].dt.to_period("M")
    monthly = df.groupby("month")[energy_col].sum().reset_index()
    monthly["energy_mwh"] = monthly[energy_col] / 1000

    result = []
    for _, row in monthly.iterrows():
        result.append(
            {
                "month": str(row["month"]),
                "year": int(row["month"].year),
                "energy_mwh": float(row["energy_mwh"]),
                "turbine_id": turbine_id,
            }
        )

    return {"data": result}
