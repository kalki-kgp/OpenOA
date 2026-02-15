export type PlantSummary = {
  name: string
  capacity_mw: number
  turbine_count: number
  date_start: string
  date_end: string
  latitude: number
  longitude: number
  avg_wind_speed_ms: number
}

export type TurbineInfo = {
  turbine_id: string
  latitude: number | null
  longitude: number | null
  hub_height_m: number | null
  rotor_diameter_m: number | null
  rated_power_mw: number | null
}

export type MonthlyEnergyPoint = {
  month: string
  energy_mwh: number
}

export type ScadaPoint = {
  time: string
  power_kw: number | null
  wind_speed_ms: number | null
  wind_direction_deg: number | null
  temperature_c: number | null
}

export type WindRoseSector = {
  direction_center_deg: number
  counts: number[]
  total: number
  frequency: number
}

export type WindRoseResponse = {
  turbine_id: string | null
  direction_bin_size_deg: number
  speed_bins_ms: number[]
  sectors: WindRoseSector[]
}

export type PowerCurvePoint = {
  wind_speed_ms: number
  power_kw: number
}

export type PowerCurveResponse = {
  turbine_id: string
  method: string
  curve: PowerCurvePoint[]
  scatter: PowerCurvePoint[]
  stats: {
    r2: number
    rmse_kw: number
    n_samples: number
  }
}

export type ElectricalLossesResponse = {
  loss_pct: number
  loss_p05_pct: number
  loss_p95_pct: number
  turbine_energy_kwh: number
  meter_energy_kwh: number
}

export type WakeLossesResponse = {
  plant_wake_loss_por_pct: number
  plant_wake_loss_lt_pct: number
  turbine_wake_loss_por_pct: Record<string, number>
  turbine_wake_loss_lt_pct: Record<string, number>
}

export type YawResult = {
  ws_bins: number[]
  turbines: Array<{
    turbine_id: string
    yaw_misalignment_deg: number
    ci_low_deg: number | null
    ci_high_deg: number | null
    by_ws_bin_deg: number[]
  }>
}

export type AepTask = {
  task_id: string
  status: 'running' | 'completed' | 'failed'
}

export type AepStatus = {
  task_id: string
  status: 'running' | 'completed' | 'failed'
  result: {
    aep_mean_gwh: number
    aep_p05_gwh: number
    aep_p95_gwh: number
    availability_mean_pct: number
    curtailment_mean_pct: number
    lt_por_ratio_mean: number
    iterations_gwh: number[]
  } | null
  error: string | null
}

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...init
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

export const api = {
  getPlantSummary: () => request<PlantSummary>('/api/plant/summary'),

  getTurbines: () => request<TurbineInfo[]>('/api/plant/turbines'),

  getMonthlyEnergy: () => request<{ points: MonthlyEnergyPoint[] }>('/api/data/monthly-energy'),

  getWindRose: (params: {
    turbine_id?: string
    start?: string
    end?: string
    direction_bins?: number
    speed_bins?: string
  }) => {
    const query = new URLSearchParams()
    if (params.turbine_id) query.set('turbine_id', params.turbine_id)
    if (params.start) query.set('start', params.start)
    if (params.end) query.set('end', params.end)
    if (params.direction_bins) query.set('direction_bins', String(params.direction_bins))
    if (params.speed_bins) query.set('speed_bins', params.speed_bins)
    return request<WindRoseResponse>(`/api/data/wind-rose?${query.toString()}`)
  },

  getScada: (params: {
    turbine_id?: string
    start?: string
    end?: string
    resample?: string
  }) => {
    const query = new URLSearchParams()
    if (params.turbine_id) query.set('turbine_id', params.turbine_id)
    if (params.start) query.set('start', params.start)
    if (params.end) query.set('end', params.end)
    if (params.resample) query.set('resample', params.resample)
    return request<{ points: ScadaPoint[] }>(`/api/data/scada?${query.toString()}`)
  },

  runPowerCurve: (payload: { turbine_id: string; method: 'IEC' | 'logistic_5' | 'gam' }) =>
    request<PowerCurveResponse>('/api/analysis/power-curve', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  runElectricalLosses: (payload: { uncertainty: boolean; num_sim: number }) =>
    request<ElectricalLossesResponse>('/api/analysis/electrical-losses', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  runWakeLosses: (payload: {
    wind_direction_data_type: 'scada' | 'tower'
    uncertainty: boolean
    num_sim: number
  }) =>
    request<WakeLossesResponse>('/api/analysis/wake-losses', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  runYawMisalignment: (payload: {
    turbine_ids?: string[]
    ws_bins: number[]
    uncertainty: boolean
    num_sim: number
  }) =>
    request<YawResult>('/api/analysis/yaw-misalignment', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  submitAep: (payload: {
    reanalysis_products: string[]
    reg_model: 'lin' | 'gam' | 'gbm' | 'etr'
    time_resolution: 'MS' | 'ME' | 'D' | 'h'
    num_sim: number
    reg_temperature: boolean
    reg_wind_direction: boolean
  }) =>
    request<AepTask>('/api/analysis/aep', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getAepStatus: (taskId: string) => request<AepStatus>(`/api/analysis/aep/status/${taskId}`)
}
