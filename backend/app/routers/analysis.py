from __future__ import annotations

import math
from datetime import datetime

import numpy as np
from fastapi import APIRouter, HTTPException
from openoa.analysis.aep import MonteCarloAEP
from openoa.analysis.electrical_losses import ElectricalLosses
from openoa.analysis.wake_losses import WakeLosses
from openoa.analysis.yaw_misalignment import StaticYawMisalignment
from openoa.utils.power_curve import functions as power_curve

from backend.app.config import settings
from backend.app.schemas import (
    AEPRequest,
    AEPResult,
    AEPStatusResponse,
    AEPTaskResponse,
    ElectricalLossRequest,
    ElectricalLossResponse,
    PowerCurveRequest,
    PowerCurveResponse,
    PowerCurveStats,
    ScatterPoint,
    WakeLossRequest,
    WakeLossResponse,
    YawMisalignmentRequest,
    YawMisalignmentResponse,
    YawTurbineResult,
    CurvePoint,
)
from backend.app.services.analysis_runner import get_aep_task, run_cached, submit_aep_task
from backend.app.services.plant_loader import get_plant


router = APIRouter(prefix="/api/analysis", tags=["analysis"])


def _finite_float(value: float | int | None) -> float | None:
    if value is None:
        return None
    if isinstance(value, (float, np.floating)) and (math.isnan(value) or math.isinf(value)):
        return None
    return float(value)


def _safe_numeric(value: float | int | None, default: float = 0.0) -> float:
    checked = _finite_float(value)
    return default if checked is None else checked


def _downsample_pairs(x: np.ndarray, y: np.ndarray, max_points: int) -> tuple[np.ndarray, np.ndarray]:
    if len(x) <= max_points:
        return x, y
    idx = np.linspace(0, len(x) - 1, max_points).astype(int)
    return x[idx], y[idx]


@router.post("/power-curve", response_model=PowerCurveResponse)
def run_power_curve_analysis(request: PowerCurveRequest) -> PowerCurveResponse:
    plant = get_plant()
    turbine_ids = set(plant.turbine_ids)
    if request.turbine_id not in turbine_ids:
        raise HTTPException(status_code=404, detail=f"Unknown turbine_id: {request.turbine_id}")

    params = request.model_dump()

    def _compute() -> PowerCurveResponse:
        turb = plant.turbine_df(request.turbine_id)[["WMET_HorWdSpd", "WTUR_W"]].dropna().copy()
        turb = turb[(turb["WMET_HorWdSpd"] >= 0) & (turb["WMET_HorWdSpd"] <= 35)]

        if turb.empty:
            raise HTTPException(status_code=404, detail="No SCADA data available for this turbine")

        ws = turb["WMET_HorWdSpd"].to_numpy()
        pwr = turb["WTUR_W"].to_numpy()

        if request.method == "IEC":
            curve_fn = power_curve.IEC(turb["WMET_HorWdSpd"], turb["WTUR_W"], interpolate=True)
        elif request.method == "logistic_5":
            curve_fn = power_curve.logistic_5_parametric(turb["WMET_HorWdSpd"], turb["WTUR_W"])
        else:
            curve_fn = power_curve.gam(turb["WMET_HorWdSpd"], turb["WTUR_W"])

        ws_grid = np.linspace(0.0, 25.0, 120)
        curve_power = np.asarray(curve_fn(ws_grid), dtype=float)

        pred = np.asarray(curve_fn(ws), dtype=float)
        resid = pwr - pred
        rmse = float(np.sqrt(np.nanmean(np.square(resid))))

        y_var = np.nansum(np.square(pwr - np.nanmean(pwr)))
        r2 = float(1 - (np.nansum(np.square(resid)) / y_var)) if y_var > 0 else 0.0

        ws_scatter, pwr_scatter = _downsample_pairs(ws, pwr, max_points=2500)

        return PowerCurveResponse(
            turbine_id=request.turbine_id,
            method=request.method,
            curve=[
                CurvePoint(wind_speed_ms=float(w), power_kw=float(p))
                for w, p in zip(ws_grid, curve_power, strict=False)
            ],
            scatter=[
                ScatterPoint(wind_speed_ms=float(w), power_kw=float(p))
                for w, p in zip(ws_scatter, pwr_scatter, strict=False)
            ],
            stats=PowerCurveStats(r2=r2, rmse_kw=rmse, n_samples=int(len(turb))),
        )

    try:
        return run_cached("power_curve", params, _compute)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Power curve analysis failed: {exc}") from exc


@router.post("/electrical-losses", response_model=ElectricalLossResponse)
def run_electrical_losses(request: ElectricalLossRequest) -> ElectricalLossResponse:
    plant = get_plant()
    params = request.model_dump()

    def _compute() -> ElectricalLossResponse:
        num_sim = request.num_sim if request.uncertainty else 1
        analysis = ElectricalLosses(plant=plant, UQ=request.uncertainty, num_sim=num_sim)
        analysis.run(num_sim=num_sim)

        losses = np.asarray(analysis.electrical_losses, dtype=float).flatten() * 100.0

        return ElectricalLossResponse(
            loss_pct=float(np.nanmean(losses)),
            loss_p05_pct=float(np.nanpercentile(losses, 5)),
            loss_p95_pct=float(np.nanpercentile(losses, 95)),
            turbine_energy_kwh=float(analysis.total_turbine_energy),
            meter_energy_kwh=float(analysis.total_meter_energy),
        )

    try:
        return run_cached("electrical_losses", params, _compute)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Electrical losses analysis failed: {exc}") from exc


@router.post("/wake-losses", response_model=WakeLossResponse)
def run_wake_losses(request: WakeLossRequest) -> WakeLossResponse:
    plant = get_plant()
    params = request.model_dump()

    def _compute() -> WakeLossResponse:
        reanalysis_products = request.reanalysis_products or list(plant.reanalysis.keys())
        num_sim = request.num_sim if request.uncertainty else 1

        analysis = WakeLosses(
            plant=plant,
            UQ=request.uncertainty,
            num_sim=num_sim,
            wind_direction_data_type=request.wind_direction_data_type,
            reanalysis_products=reanalysis_products,
        )
        analysis.run(num_sim=num_sim)

        if request.uncertainty:
            por = float(np.nanmean(np.asarray(analysis.wake_losses_por)))
            lt = float(np.nanmean(np.asarray(analysis.wake_losses_lt)))
            turb_por_vals = np.nanmean(np.asarray(analysis.turbine_wake_losses_por), axis=0)
            turb_lt_vals = np.nanmean(np.asarray(analysis.turbine_wake_losses_lt), axis=0)
        else:
            por = float(np.asarray(analysis.wake_losses_por).squeeze())
            lt = float(np.asarray(analysis.wake_losses_lt).squeeze())
            turb_por_vals = np.asarray(analysis.turbine_wake_losses_por).squeeze()
            turb_lt_vals = np.asarray(analysis.turbine_wake_losses_lt).squeeze()

        turbine_ids = [str(tid) for tid in analysis.turbine_ids]
        turbine_por = {
            turbine_id: _safe_numeric(value * 100.0)
            for turbine_id, value in zip(turbine_ids, np.asarray(turb_por_vals), strict=False)
        }
        turbine_lt = {
            turbine_id: _safe_numeric(value * 100.0)
            for turbine_id, value in zip(turbine_ids, np.asarray(turb_lt_vals), strict=False)
        }

        return WakeLossResponse(
            plant_wake_loss_por_pct=por * 100.0,
            plant_wake_loss_lt_pct=lt * 100.0,
            turbine_wake_loss_por_pct=turbine_por,
            turbine_wake_loss_lt_pct=turbine_lt,
        )

    try:
        return run_cached("wake_losses", params, _compute)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Wake losses analysis failed: {exc}") from exc


@router.post("/yaw-misalignment", response_model=YawMisalignmentResponse)
def run_yaw_misalignment(request: YawMisalignmentRequest) -> YawMisalignmentResponse:
    plant = get_plant()
    params = request.model_dump()

    def _compute() -> YawMisalignmentResponse:
        num_sim = request.num_sim if request.uncertainty else 1
        analysis = StaticYawMisalignment(
            plant=plant,
            turbine_ids=request.turbine_ids,
            ws_bins=request.ws_bins,
            UQ=request.uncertainty,
            num_sim=num_sim,
        )
        analysis.run(num_sim=num_sim, ws_bins=request.ws_bins)

        turbine_ids = [str(tid) for tid in analysis.turbine_ids]

        if request.uncertainty:
            avg_vals = np.asarray(analysis.yaw_misalignment_avg, dtype=float)
            ci_vals = np.asarray(analysis.yaw_misalignment_95ci, dtype=float)
            by_ws_vals = np.asarray(analysis.yaw_misalignment_avg_ws, dtype=float)
        else:
            avg_vals = np.asarray(analysis.yaw_misalignment, dtype=float)
            ci_vals = np.empty((len(turbine_ids), 2), dtype=float)
            ci_vals[:] = np.nan
            by_ws_vals = np.asarray(analysis.yaw_misalignment_ws, dtype=float)

        turbines = [
            YawTurbineResult(
                turbine_id=turbine_id,
                yaw_misalignment_deg=_safe_numeric(avg_vals[index]),
                ci_low_deg=_finite_float(ci_vals[index, 0]),
                ci_high_deg=_finite_float(ci_vals[index, 1]),
                by_ws_bin_deg=[_safe_numeric(v) for v in np.asarray(by_ws_vals[index]).tolist()],
            )
            for index, turbine_id in enumerate(turbine_ids)
        ]

        return YawMisalignmentResponse(ws_bins=request.ws_bins, turbines=turbines)

    try:
        return run_cached("yaw_misalignment", params, _compute)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Yaw misalignment analysis failed: {exc}") from exc


@router.post("/aep", response_model=AEPTaskResponse)
async def submit_aep(request: AEPRequest) -> AEPTaskResponse:
    plant = get_plant()

    params = request.model_dump()
    params.setdefault("num_sim", settings.default_aep_num_sim)

    def _compute() -> AEPResult:
        reanalysis_products = request.reanalysis_products or list(plant.reanalysis.keys())

        analysis = MonteCarloAEP(
            plant=plant,
            reanalysis_products=reanalysis_products,
            reg_model=request.reg_model,
            time_resolution=request.time_resolution,
            reg_temperature=request.reg_temperature,
            reg_wind_direction=request.reg_wind_direction,
        )
        analysis.run(num_sim=request.num_sim, progress_bar=False)
        results = analysis.results

        aep_values = results["aep_GWh"].to_numpy(dtype=float)
        avail_values = results["avail_pct"].to_numpy(dtype=float) * 100.0
        curt_values = results["curt_pct"].to_numpy(dtype=float) * 100.0

        return AEPResult(
            aep_mean_gwh=float(np.nanmean(aep_values)),
            aep_p05_gwh=float(np.nanpercentile(aep_values, 5)),
            aep_p95_gwh=float(np.nanpercentile(aep_values, 95)),
            availability_mean_pct=float(np.nanmean(avail_values)),
            curtailment_mean_pct=float(np.nanmean(curt_values)),
            lt_por_ratio_mean=float(np.nanmean(results["lt_por_ratio"].to_numpy(dtype=float))),
            iterations_gwh=[float(value) for value in aep_values.tolist()],
        )

    task_id, status = await submit_aep_task(params, _compute)
    return AEPTaskResponse(task_id=task_id, status=status)


@router.get("/aep/status/{task_id}", response_model=AEPStatusResponse)
def get_aep_status(task_id: str) -> AEPStatusResponse:
    task = get_aep_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    result = task.get("result")
    if isinstance(result, AEPResult):
        result_model = result
    elif result is None:
        result_model = None
    else:
        result_model = AEPResult.model_validate(result)

    return AEPStatusResponse(
        task_id=task_id,
        status=task["status"],
        result=result_model,
        error=task.get("error"),
    )
