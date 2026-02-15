import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { api, type ElectricalLossesResponse, type WakeLossesResponse } from '../api/client'
import { ChartCard } from '../components/ChartCard'
import { LoadingOverlay } from '../components/LoadingOverlay'

export function LossesAnalysis() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [electrical, setElectrical] = useState<ElectricalLossesResponse | null>(null)
  const [wake, setWake] = useState<WakeLossesResponse | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const [electricalRes, wakeRes] = await Promise.all([
        api.runElectricalLosses({ uncertainty: true, num_sim: 300 }),
        api.runWakeLosses({ wind_direction_data_type: 'scada', uncertainty: false, num_sim: 1 })
      ])
      setElectrical(electricalRes)
      setWake(wakeRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loss analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const wakeChartData = Object.entries(wake?.turbine_wake_loss_lt_pct ?? {}).map(([turbine, value]) => ({
    turbine,
    wake_loss: Number(value.toFixed(2))
  }))

  return (
    <div className="page page-with-overlay">
      <header className="page-header">
        <div>
          <h2>Losses Analysis</h2>
          <p>Electrical and wake losses across the period of record and long-term correction.</p>
        </div>
        <button className="button-primary" onClick={() => void run()} disabled={loading}>
          Run Losses
        </button>
      </header>

      {loading ? <LoadingOverlay label="Running losses analysis" /> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="split-grid">
        <ChartCard title="Electrical Losses" subtitle="Meter vs turbine generated energy">
          {electrical ? (
            <div className="stats-stack">
              <div className="stat-line">
                <span>Mean Loss</span>
                <strong>{electrical.loss_pct.toFixed(2)}%</strong>
              </div>
              <div className="stat-line">
                <span>P05 / P95</span>
                <strong>
                  {electrical.loss_p05_pct.toFixed(2)} / {electrical.loss_p95_pct.toFixed(2)}%
                </strong>
              </div>
              <div className="stat-line">
                <span>Turbine Energy</span>
                <strong>{(electrical.turbine_energy_kwh / 1000).toFixed(1)} MWh</strong>
              </div>
              <div className="stat-line">
                <span>Meter Energy</span>
                <strong>{(electrical.meter_energy_kwh / 1000).toFixed(1)} MWh</strong>
              </div>
            </div>
          ) : (
            <p className="muted-text">Run the analysis to populate values.</p>
          )}
        </ChartCard>

        <ChartCard title="Wake Losses" subtitle="Per-turbine long-term wake loss (%)">
          {wakeChartData.length ? (
            <div className="chart-height-lg">
              <ResponsiveContainer>
                <BarChart data={wakeChartData}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#213141" />
                  <XAxis dataKey="turbine" tick={{ fill: '#9ba8b4', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ba8b4', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="wake_loss" fill="#f5a623" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted-text">Run the analysis to populate wake losses.</p>
          )}
        </ChartCard>
      </section>

      <section className="split-grid">
        <ChartCard title="Plant Wake Summary" subtitle="POR and LT wake losses">
          {wake ? (
            <div className="stats-stack">
              <div className="stat-line">
                <span>Period of Record</span>
                <strong>{wake.plant_wake_loss_por_pct.toFixed(2)}%</strong>
              </div>
              <div className="stat-line">
                <span>Long-Term Corrected</span>
                <strong>{wake.plant_wake_loss_lt_pct.toFixed(2)}%</strong>
              </div>
            </div>
          ) : (
            <p className="muted-text">Run the analysis to populate wake summary.</p>
          )}
        </ChartCard>
      </section>
    </div>
  )
}
