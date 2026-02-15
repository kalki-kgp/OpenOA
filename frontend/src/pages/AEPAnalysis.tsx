import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { api, type AepStatus } from '../api/client'
import { ChartCard } from '../components/ChartCard'
import { StatusBadge } from '../components/StatusBadge'

export function AEPAnalysis() {
  const [form, setForm] = useState({
    reanalysis_products: ['era5', 'merra2'],
    reg_model: 'lin' as 'lin' | 'gam' | 'gbm' | 'etr',
    time_resolution: 'MS' as 'MS' | 'ME' | 'D' | 'h',
    num_sim: 60,
    reg_temperature: false,
    reg_wind_direction: false
  })
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<AepStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = async () => {
    setError(null)
    try {
      const task = await api.submitAep(form)
      setTaskId(task.task_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start AEP analysis')
    }
  }

  useEffect(() => {
    if (!taskId) return

    let intervalId: number | null = null

    const poll = async () => {
      try {
        const nextStatus = await api.getAepStatus(taskId)
        setStatus(nextStatus)
        if (nextStatus.status === 'completed' || nextStatus.status === 'failed') {
          if (intervalId) window.clearInterval(intervalId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to poll AEP status')
      }
    }

    void poll()
    intervalId = window.setInterval(() => {
      void poll()
    }, 2000)

    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [taskId])

  const histogramData = useMemo(() => {
    const values = status?.result?.iterations_gwh ?? []
    return values.map((value, index) => ({ index: index + 1, aep: Number(value.toFixed(3)) }))
  }, [status])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>AEP Analysis</h2>
          <p>Monte Carlo annual energy estimation with uncertainty tracking.</p>
        </div>
        <StatusBadge tone={status?.status === 'failed' ? 'error' : status?.status === 'completed' ? 'ok' : 'warn'}>
          {status?.status ?? 'idle'}
        </StatusBadge>
      </header>

      <section className="control-row">
        <label>
          Regression Model
          <select value={form.reg_model} onChange={(event) => setForm((prev) => ({ ...prev, reg_model: event.target.value as 'lin' | 'gam' | 'gbm' | 'etr' }))}>
            <option value="lin">Linear</option>
            <option value="gam">GAM</option>
            <option value="gbm">GBM</option>
            <option value="etr">Extra Trees</option>
          </select>
        </label>

        <label>
          Time Resolution
          <select value={form.time_resolution} onChange={(event) => setForm((prev) => ({ ...prev, time_resolution: event.target.value as 'MS' | 'ME' | 'D' | 'h' }))}>
            <option value="MS">Monthly Start</option>
            <option value="ME">Monthly End</option>
            <option value="D">Daily</option>
            <option value="h">Hourly</option>
          </select>
        </label>

        <label>
          Simulations
          <input
            type="number"
            min={5}
            max={300}
            value={form.num_sim}
            onChange={(event) => setForm((prev) => ({ ...prev, num_sim: Number(event.target.value) }))}
          />
        </label>

        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={form.reg_temperature}
            onChange={(event) => setForm((prev) => ({ ...prev, reg_temperature: event.target.checked }))}
          />
          Use Temperature
        </label>

        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={form.reg_wind_direction}
            onChange={(event) => setForm((prev) => ({ ...prev, reg_wind_direction: event.target.checked }))}
          />
          Use Wind Direction
        </label>

        <button className="button-primary" onClick={() => void runAnalysis()}>
          Run Analysis
        </button>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {status?.error ? <p className="error-text">{status.error}</p> : null}

      <section className="split-grid">
        <ChartCard title="AEP Results" subtitle="Mean and uncertainty interval">
          {status?.result ? (
            <div className="stats-stack">
              <div className="stat-line">
                <span>AEP Mean</span>
                <strong>{status.result.aep_mean_gwh.toFixed(3)} GWh</strong>
              </div>
              <div className="stat-line">
                <span>P05 / P95</span>
                <strong>
                  {status.result.aep_p05_gwh.toFixed(3)} / {status.result.aep_p95_gwh.toFixed(3)} GWh
                </strong>
              </div>
              <div className="stat-line">
                <span>Availability Mean</span>
                <strong>{status.result.availability_mean_pct.toFixed(2)}%</strong>
              </div>
              <div className="stat-line">
                <span>Curtailment Mean</span>
                <strong>{status.result.curtailment_mean_pct.toFixed(2)}%</strong>
              </div>
              <div className="stat-line">
                <span>LT/POR Ratio</span>
                <strong>{status.result.lt_por_ratio_mean.toFixed(3)}</strong>
              </div>
            </div>
          ) : (
            <p className="muted-text">Submit analysis to populate results.</p>
          )}
        </ChartCard>

        <ChartCard title="Monte Carlo Distribution" subtitle="AEP values per simulation run">
          <div className="chart-height-lg">
            <ResponsiveContainer>
              <BarChart data={histogramData}>
                <XAxis dataKey="index" tick={{ fill: '#9ba8b4', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9ba8b4', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="aep" fill="#00d4aa" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>
    </div>
  )
}
