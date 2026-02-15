const API_BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail || res.statusText);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),

  health: () => api.get<{ status: string; plant_loaded: boolean }>("/health"),
  plant: {
    summary: () => api.get<PlantSummary>("/plant/summary"),
    turbines: () => api.get<TurbineInfo[]>("/plant/turbines"),
  },
  data: {
    scada: (params?: { turbine_id?: string; start?: string; end?: string; resample?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return api.get<{ data: ScadaPoint[] }>(`/data/scada${q ? `?${q}` : ""}`);
    },
    windRose: (turbine_id?: string) =>
      api.get<{ bins: WindRoseBin[] }>(`/data/wind-rose${turbine_id ? `?turbine_id=${turbine_id}` : ""}`),
    monthlyEnergy: (turbine_id?: string) =>
      api.get<{ data: MonthlyEnergyPoint[] }>(`/data/monthly-energy${turbine_id ? `?turbine_id=${turbine_id}` : ""}`),
  },
  analysis: {
    powerCurve: (body: { turbine_id?: string; method?: string }) =>
      api.post<PowerCurveResponse>("/analysis/power-curve", body),
    electricalLosses: (body?: { uncertainty?: boolean }) =>
      api.post<ElectricalLossesResponse>("/analysis/electrical-losses", body ?? {}),
    wakeLosses: (body?: { wind_direction_data_type?: string }) =>
      api.post<WakeLossesResponse>("/analysis/wake-losses", body ?? {}),
    yawMisalignment: (body?: { turbine_ids?: string[]; ws_bins?: number[] }) =>
      api.post<YawMisalignmentResponse>("/analysis/yaw-misalignment", body ?? {}),
    aep: (body?: { reanalysis_products?: string[]; reg_model?: string; time_resolution?: string }) =>
      api.post<AEPStatusResponse>("/analysis/aep", body ?? {}),
    aepStatus: (taskId: string) =>
      api.get<AEPStatusResponse>(`/analysis/aep/status/${taskId}`),
  },
};

export interface PlantSummary {
  name: string;
  capacity_mw: number;
  turbine_count: number;
  date_range_start: string;
  date_range_end: string;
  latitude: number;
  longitude: number;
}

export interface TurbineInfo {
  asset_id: string;
  latitude: number;
  longitude: number;
  elevation: number;
  hub_height: number;
  rotor_diameter: number;
  rated_power: number;
  type: string;
}

export interface ScadaPoint {
  time: string;
  power_kw?: number;
  wind_speed?: number;
  wind_direction?: number;
  temperature?: number;
  energy_kwh?: number;
}

export interface WindRoseBin {
  direction_center: number;
  speed_min: number;
  speed_max: number;
  frequency: number;
  count: number;
}

export interface MonthlyEnergyPoint {
  month: string;
  year: number;
  energy_mwh: number;
  turbine_id?: string;
}

export interface PowerCurveResponse {
  scatter_data: { wind_speed: number; power: number }[];
  fitted_curve: { wind_speed: number; power: number }[];
  turbine_id?: string;
  method: string;
}

export interface ElectricalLossesResponse {
  loss_percent: number;
  total_turbine_energy: number;
  total_meter_energy: number;
  uncertainty_lower?: number;
  uncertainty_upper?: number;
}

export interface WakeLossesResponse {
  plant_wake_loss_percent: number;
  turbine_losses: { turbine_id: string; wake_loss_pct: number }[];
}

export interface YawMisalignmentResponse {
  turbine_results: { turbine_id: string; yaw_misalignment_deg: number }[];
}

export interface AEPStatusResponse {
  task_id: string;
  status: "running" | "completed" | "failed";
  results?: AEPResults;
  error?: string;
}

export interface AEPResults {
  aep_gwh: number;
  aep_lower?: number;
  aep_upper?: number;
  availability_pct: number;
  curtailment_pct: number;
  lt_por_ratio: number;
  r2: number;
  n_points: number;
}
