"""Pydantic response models for API endpoints."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# Plant schemas
class PlantSummary(BaseModel):
    """Plant overview summary."""

    name: str = "La Haute Borne"
    capacity_mw: float = Field(..., description="Plant capacity in MW")
    turbine_count: int = Field(..., description="Number of turbines")
    date_range_start: datetime = Field(..., description="Start of data period")
    date_range_end: datetime = Field(..., description="End of data period")
    latitude: float = Field(..., description="Plant centroid latitude")
    longitude: float = Field(..., description="Plant centroid longitude")


class TurbineInfo(BaseModel):
    """Single turbine asset information."""

    asset_id: str
    latitude: float
    longitude: float
    elevation: float
    hub_height: float
    rotor_diameter: float
    rated_power: float
    type: str = "turbine"


# Data schemas
class ScadaDataPoint(BaseModel):
    """Single SCADA time series point."""

    time: str
    power_kw: float | None = None
    wind_speed: float | None = None
    wind_direction: float | None = None
    temperature: float | None = None
    energy_kwh: float | None = None


class WindRoseBin(BaseModel):
    """Wind rose bin (direction + speed bin)."""

    direction_center: float
    speed_min: float
    speed_max: float
    frequency: float
    count: int


class MonthlyEnergyPoint(BaseModel):
    """Monthly energy production."""

    month: str
    year: int
    energy_mwh: float
    turbine_id: str | None = None


# Analysis schemas
class PowerCurveRequest(BaseModel):
    """Request for power curve analysis."""

    turbine_id: str | None = None
    method: str = "IEC"


class PowerCurveResponse(BaseModel):
    """Power curve analysis results."""

    scatter_data: list[dict[str, Any]]
    fitted_curve: list[dict[str, float]]
    turbine_id: str | None = None
    method: str


class ElectricalLossesRequest(BaseModel):
    """Request for electrical losses analysis."""

    uncertainty: bool = False


class ElectricalLossesResponse(BaseModel):
    """Electrical losses analysis results."""

    loss_percent: float
    total_turbine_energy: float
    total_meter_energy: float
    uncertainty_lower: float | None = None
    uncertainty_upper: float | None = None


class WakeLossesRequest(BaseModel):
    """Request for wake losses analysis."""

    wind_direction_data_type: str = "scada"


class WakeLossesResponse(BaseModel):
    """Wake losses analysis results."""

    plant_wake_loss_percent: float
    turbine_losses: list[dict[str, Any]]


class YawMisalignmentRequest(BaseModel):
    """Request for yaw misalignment analysis."""

    turbine_ids: list[str] | None = None
    ws_bins: list[float] | None = None


class YawMisalignmentResponse(BaseModel):
    """Yaw misalignment analysis results."""

    turbine_results: list[dict[str, Any]]


class AEPRequest(BaseModel):
    """Request for AEP analysis."""

    reanalysis_products: list[str] = Field(default_factory=lambda: ["era5", "merra2"])
    reg_model: str = "lin"
    time_resolution: str = "MS"


class AEPStatusResponse(BaseModel):
    """AEP analysis status (polling)."""

    task_id: str
    status: str  # "running" | "completed" | "failed"
    results: dict[str, Any] | None = None
    error: str | None = None


class AEPResults(BaseModel):
    """AEP analysis results."""

    aep_gwh: float
    aep_lower: float | None = None
    aep_upper: float | None = None
    availability_pct: float
    curtailment_pct: float
    lt_por_ratio: float
    r2: float
    n_points: int
