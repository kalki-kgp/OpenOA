from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class PlantSummaryResponse(BaseModel):
    name: str
    capacity_mw: float
    turbine_count: int
    date_start: datetime
    date_end: datetime
    latitude: float
    longitude: float
    avg_wind_speed_ms: float


class TurbineInfo(BaseModel):
    turbine_id: str
    latitude: float | None = None
    longitude: float | None = None
    hub_height_m: float | None = None
    rotor_diameter_m: float | None = None
    rated_power_mw: float | None = None


class ScadaPoint(BaseModel):
    time: datetime
    power_kw: float | None = None
    wind_speed_ms: float | None = None
    wind_direction_deg: float | None = None
    temperature_c: float | None = None


class ScadaResponse(BaseModel):
    turbine_id: str | None = None
    resample: str
    points: list[ScadaPoint]


class WindRoseSector(BaseModel):
    direction_center_deg: float
    counts: list[float]
    total: float
    frequency: float


class WindRoseResponse(BaseModel):
    turbine_id: str | None = None
    direction_bin_size_deg: float
    speed_bins_ms: list[float]
    sectors: list[WindRoseSector]


class MonthlyEnergyPoint(BaseModel):
    month: datetime
    energy_mwh: float


class MonthlyEnergyResponse(BaseModel):
    points: list[MonthlyEnergyPoint]


class PowerCurveRequest(BaseModel):
    turbine_id: str
    method: Literal["IEC", "logistic_5", "gam"] = "IEC"


class CurvePoint(BaseModel):
    wind_speed_ms: float
    power_kw: float


class ScatterPoint(BaseModel):
    wind_speed_ms: float
    power_kw: float


class PowerCurveStats(BaseModel):
    r2: float
    rmse_kw: float
    n_samples: int


class PowerCurveResponse(BaseModel):
    turbine_id: str
    method: str
    curve: list[CurvePoint]
    scatter: list[ScatterPoint]
    stats: PowerCurveStats


class ElectricalLossRequest(BaseModel):
    uncertainty: bool = False
    num_sim: int = Field(default=200, ge=1, le=20000)


class ElectricalLossResponse(BaseModel):
    loss_pct: float
    loss_p05_pct: float
    loss_p95_pct: float
    turbine_energy_kwh: float
    meter_energy_kwh: float


class WakeLossRequest(BaseModel):
    wind_direction_data_type: Literal["scada", "tower"] = "scada"
    uncertainty: bool = False
    num_sim: int = Field(default=30, ge=1, le=1000)
    reanalysis_products: list[str] | None = None


class WakeLossResponse(BaseModel):
    plant_wake_loss_por_pct: float
    plant_wake_loss_lt_pct: float
    turbine_wake_loss_por_pct: dict[str, float]
    turbine_wake_loss_lt_pct: dict[str, float]


class YawMisalignmentRequest(BaseModel):
    turbine_ids: list[str] | None = None
    ws_bins: list[float] = Field(default_factory=lambda: [5.0, 6.0, 7.0, 8.0])
    uncertainty: bool = True
    num_sim: int = Field(default=40, ge=1, le=500)


class YawTurbineResult(BaseModel):
    turbine_id: str
    yaw_misalignment_deg: float
    ci_low_deg: float | None = None
    ci_high_deg: float | None = None
    by_ws_bin_deg: list[float]


class YawMisalignmentResponse(BaseModel):
    ws_bins: list[float]
    turbines: list[YawTurbineResult]


class AEPRequest(BaseModel):
    reanalysis_products: list[str] | None = None
    reg_model: Literal["lin", "gam", "gbm", "etr"] = "lin"
    time_resolution: Literal["MS", "ME", "D", "h"] = "MS"
    num_sim: int = Field(default=60, ge=5, le=2000)
    reg_temperature: bool = False
    reg_wind_direction: bool = False


class AEPResult(BaseModel):
    aep_mean_gwh: float
    aep_p05_gwh: float
    aep_p95_gwh: float
    availability_mean_pct: float
    curtailment_mean_pct: float
    lt_por_ratio_mean: float
    iterations_gwh: list[float]


class AEPTaskResponse(BaseModel):
    task_id: str
    status: Literal["running", "completed", "failed"]


class AEPStatusResponse(BaseModel):
    task_id: str
    status: Literal["running", "completed", "failed"]
    result: AEPResult | None = None
    error: str | None = None
