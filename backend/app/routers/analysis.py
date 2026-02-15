"""Analysis endpoints - power curve, electrical losses, wake losses, yaw, AEP."""

import asyncio
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.schemas import (
    AEPRequest,
    AEPStatusResponse,
    ElectricalLossesRequest,
    ElectricalLossesResponse,
    PowerCurveRequest,
    PowerCurveResponse,
    WakeLossesRequest,
    WakeLossesResponse,
    YawMisalignmentRequest,
    YawMisalignmentResponse,
)
from app.services.analysis_runner import (
    create_aep_task,
    get_aep_task,
    get_cached,
    set_cached,
    update_aep_task,
)
from app.services.plant_loader import get_plant

router = APIRouter()


def _run_aep_analysis(params: dict) -> dict[str, Any]:
    """Run MonteCarloAEP in a blocking manner (for thread pool)."""
    from openoa.analysis.aep import MonteCarloAEP

    plant = get_plant()
    if plant is None:
        raise RuntimeError("Plant data not loaded")

    reanalysis = params.get("reanalysis_products", ["era5", "merra2"])
    reg_model = params.get("reg_model", "lin")
    time_res = params.get("time_resolution", "MS")

    aep = MonteCarloAEP(
        plant,
        reanalysis_products=reanalysis,
        reg_temperature=True,
        reg_wind_direction=True,
        reg_model=reg_model,
        time_resolution=time_res,
    )
    aep.run()

    results = aep.results
    if results is None or results.empty:
        return {"error": "No results from AEP analysis"}

    row = results.iloc[0]
    return {
        "aep_gwh": float(row.get("aep_GWh", 0)),
        "aep_lower": float(row.get("aep_lower", 0)) if "aep_lower" in row else None,
        "aep_upper": float(row.get("aep_upper", 0)) if "aep_upper" in row else None,
        "availability_pct": float(row.get("avail_pct", 0)) * 100,
        "curtailment_pct": float(row.get("curt_pct", 0)) * 100,
        "lt_por_ratio": float(row.get("lt_por_ratio", 0)),
        "r2": float(row.get("r2", 0)),
        "n_points": int(row.get("n_points", 0)),
    }


@router.post("/power-curve", response_model=PowerCurveResponse)
async def run_power_curve(req: PowerCurveRequest):
    """Run power curve analysis."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=503, detail="Plant data not loaded")

    params = {"turbine_id": req.turbine_id, "method": req.method}
    cached = get_cached("power_curve", params)
    if cached:
        return PowerCurveResponse(**cached)

    def _run():
        import pandas as pd
        from openoa.utils.power_curve import IEC, gam, logistic_5_parametric

        scada = plant.scada
        if scada is None:
            raise ValueError("No SCADA data")

        ws_col = "WMET_HorWdSpd" if "WMET_HorWdSpd" in scada.columns else "Ws_avg"
        pwr_col = "WTUR_W" if "WTUR_W" in scada.columns else "P_avg"
        asset_col = "asset_id" if "asset_id" in scada.columns else "Wind_turbine_name"

        df = scada.copy()
        if hasattr(df, "reset_index") and isinstance(df.index, pd.MultiIndex):
            df = df.reset_index()
        df = df[[c for c in [ws_col, pwr_col, asset_col] if c in df.columns]].dropna()
        if req.turbine_id:
            df = df[df[asset_col] == req.turbine_id]

        scatter_data = [
            {"wind_speed": float(row[ws_col]), "power": float(row[pwr_col])}
            for _, row in df.head(500).iterrows()
        ]

        method_map = {"IEC": IEC, "logistic_5": logistic_5_parametric, "gam": gam}
        fit_fn = method_map.get(req.method, IEC)
        fitted_curve = []
        try:
            import numpy as np

            curve = fit_fn(df[ws_col], df[pwr_col])
            ws_fit = sorted(df[ws_col].dropna().unique())[:50]
            for w in ws_fit:
                p = curve(np.array([float(w)]))
                p_val = float(np.asarray(p).flatten()[0])
                fitted_curve.append({"wind_speed": float(w), "power": p_val})
        except Exception:
            pass

        return {
            "scatter_data": scatter_data,
            "fitted_curve": fitted_curve,
            "turbine_id": req.turbine_id,
            "method": req.method,
        }

    result = await asyncio.to_thread(_run)
    set_cached("power_curve", params, result)
    return PowerCurveResponse(**result)


@router.post("/electrical-losses", response_model=ElectricalLossesResponse)
async def run_electrical_losses(req: ElectricalLossesRequest):
    """Run electrical losses analysis."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=503, detail="Plant data not loaded")

    params = {"uncertainty": req.uncertainty}
    cached = get_cached("electrical_losses", params)
    if cached:
        return ElectricalLossesResponse(**cached)

    def _run():
        import numpy as np
        from openoa.analysis.electrical_losses import ElectricalLosses

        el = ElectricalLosses(plant, UQ=req.uncertainty, num_sim=100 if req.uncertainty else 1)
        el.run()
        losses = el.electrical_losses
        if losses is None or len(losses) == 0:
            return {
                "loss_percent": 0.0,
                "total_turbine_energy": 0.0,
                "total_meter_energy": 0.0,
                "uncertainty_lower": None,
                "uncertainty_upper": None,
            }
        loss_pct = float(np.mean(losses)) * 100
        uq_lower = float(np.percentile(losses, 2.5)) * 100 if req.uncertainty else None
        uq_upper = float(np.percentile(losses, 97.5)) * 100 if req.uncertainty else None

        tt = getattr(el, "total_turbine_energy", None)
        tm = getattr(el, "total_meter_energy", None)
        tt_val = float(tt) if tt is not None and np.isscalar(tt) else (float(tt.iloc[0]) if hasattr(tt, "iloc") else 0.0)
        tm_val = float(tm) if tm is not None and np.isscalar(tm) else (float(tm.iloc[0]) if hasattr(tm, "iloc") else 0.0)

        return {
            "loss_percent": loss_pct,
            "total_turbine_energy": tt_val,
            "total_meter_energy": tm_val,
            "uncertainty_lower": uq_lower,
            "uncertainty_upper": uq_upper,
        }

    result = await asyncio.to_thread(_run)
    set_cached("electrical_losses", params, result)
    return ElectricalLossesResponse(**result)


@router.post("/wake-losses", response_model=WakeLossesResponse)
async def run_wake_losses(req: WakeLossesRequest):
    """Run wake losses analysis."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=503, detail="Plant data not loaded")

    params = {"wind_direction_data_type": req.wind_direction_data_type}
    cached = get_cached("wake_losses", params)
    if cached:
        return WakeLossesResponse(**cached)

    def _run():
        import numpy as np
        from openoa.analysis.wake_losses import WakeLosses

        wl = WakeLosses(plant, wind_direction_data_type=req.wind_direction_data_type, UQ=False)
        wl.run()
        plant_loss = float(getattr(wl, "wake_losses_por_mean", 0) or getattr(wl, "wake_losses_por", 0) or 0) * 100
        turbine_losses = []
        twl = getattr(wl, "turbine_wake_losses_por_mean", None) or getattr(wl, "turbine_wake_losses_por", None)
        if twl is not None:
            twl_arr = np.atleast_1d(twl)
            for i, tid in enumerate(plant.turbine_ids):
                pct = float(twl_arr[i]) * 100 if i < len(twl_arr) else 0.0
                turbine_losses.append({"turbine_id": str(tid), "wake_loss_pct": pct})
        return {"plant_wake_loss_percent": plant_loss, "turbine_losses": turbine_losses}

    result = await asyncio.to_thread(_run)
    set_cached("wake_losses", params, result)
    return WakeLossesResponse(**result)


@router.post("/yaw-misalignment", response_model=YawMisalignmentResponse)
async def run_yaw_misalignment(req: YawMisalignmentRequest):
    """Run static yaw misalignment analysis."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=503, detail="Plant data not loaded")

    params = {"turbine_ids": req.turbine_ids, "ws_bins": req.ws_bins}
    cached = get_cached("yaw_misalignment", params)
    if cached:
        return YawMisalignmentResponse(**cached)

    def _run():
        from openoa.analysis.yaw_misalignment import StaticYawMisalignment

        ws_bins = req.ws_bins or [5.0, 6.0, 7.0, 8.0]
        ya = StaticYawMisalignment(plant, turbine_ids=req.turbine_ids, ws_bins=ws_bins, UQ=False)
        ya.run()
        results = []
        if hasattr(ya, "yaw_misalignment_avg") and ya.yaw_misalignment_avg is not None:
            for tid, val in zip(plant.turbine_ids, ya.yaw_misalignment_avg):
                results.append({"turbine_id": str(tid), "yaw_misalignment_deg": float(val)})
        return {"turbine_results": results}

    result = await asyncio.to_thread(_run)
    set_cached("yaw_misalignment", params, result)
    return YawMisalignmentResponse(**result)


async def _run_aep_background(task_id: str, params: dict):
    """Background task to run AEP analysis."""
    try:
        res = await asyncio.to_thread(_run_aep_analysis, params)
        set_cached("aep", params, res)
        update_aep_task(task_id, "completed", results=res)
    except Exception as e:
        update_aep_task(task_id, "failed", error=str(e))


@router.post("/aep")
async def start_aep_analysis(req: AEPRequest, background_tasks: BackgroundTasks):
    """Start AEP analysis (async). Returns task_id for polling."""
    plant = get_plant()
    if plant is None:
        raise HTTPException(status_code=503, detail="Plant data not loaded")

    params = {
        "reanalysis_products": req.reanalysis_products,
        "reg_model": req.reg_model,
        "time_resolution": req.time_resolution,
    }
    cached = get_cached("aep", params)
    if cached:
        task_id = create_aep_task()
        update_aep_task(task_id, "completed", results=cached)
        return AEPStatusResponse(task_id=task_id, status="completed", results=cached)

    task_id = create_aep_task()
    update_aep_task(task_id, "running")

    background_tasks.add_task(_run_aep_background, task_id, params)
    return AEPStatusResponse(task_id=task_id, status="running")


@router.get("/aep/status/{task_id}", response_model=AEPStatusResponse)
async def get_aep_status(task_id: str):
    """Poll AEP analysis status and results."""
    task = get_aep_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return AEPStatusResponse(
        task_id=task_id,
        status=task["status"],
        results=task.get("results"),
        error=task.get("error"),
    )
