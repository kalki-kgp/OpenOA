import { useState } from 'react'
import { Bar, BarChart, ErrorBar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { api, type YawResult } from '../api/client'
import { ChartCard } from '../components/ChartCard'
import { LoadingOverlay } from '../components/LoadingOverlay'

export function YawAnalysis() {
  const [binsInput, setBinsInput] = useState('5,6,7,8')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<YawResult | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      const ws_bins = binsInput
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => !Number.isNaN(value))

      const data = await api.runYawMisalignment({
        ws_bins,
        uncertainty: true,
        num_sim: 60
      })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yaw analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const chartData = (result?.turbines ?? []).map((turbine) => ({
    turbine: turbine.turbine_id,
    value: Number(turbine.yaw_misalignment_deg.toFixed(2)),
    errLow: turbine.ci_low_deg ?? turbine.yaw_misalignment_deg,
    errHigh: turbine.ci_high_deg ?? turbine.yaw_misalignment_deg,
    errSpan: [
      Number((turbine.yaw_misalignment_deg - (turbine.ci_low_deg ?? turbine.yaw_misalignment_deg)).toFixed(3)),
      Number(((turbine.ci_high_deg ?? turbine.yaw_misalignment_deg) - turbine.yaw_misalignment_deg).toFixed(3))
    ]
  }))

  return (
    <div className="page page-with-overlay">
      <header className="page-header">
        <div>
          <h2>Yaw Misalignment</h2>
          <p>Per-turbine static yaw estimates with confidence intervals.</p>
        </div>
      </header>

      <section className="control-row">
        <label>
          Wind Speed Bins
          <input value={binsInput} onChange={(event) => setBinsInput(event.target.value)} />
        </label>
        <button className="button-primary" onClick={() => void run()} disabled={loading}>
          Run Yaw Analysis
        </button>
      </section>

      {loading ? (
        <LoadingOverlay label="Running yaw analysis. This can take a bit of time, please do not worry." />
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}

      <section className="split-grid">
        <ChartCard title="Yaw Offset by Turbine" subtitle="Mean misalignment with 95% confidence interval">
          {chartData.length ? (
            <div className="chart-height-lg">
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <XAxis dataKey="turbine" tick={{ fill: '#9ba8b4', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ba8b4', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00d4aa" radius={[4, 4, 0, 0]}>
                    <ErrorBar dataKey="errSpan" width={3} strokeWidth={1.2} stroke="#f5a623" direction="y" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted-text">Run the analysis to populate results.</p>
          )}
        </ChartCard>

        <ChartCard title="Summary Table" subtitle="Yaw values per turbine">
          {result ? (
            <div className="table-wrap">
              <table className="turbine-table">
                <thead>
                  <tr>
                    <th>Turbine</th>
                    <th>Mean (deg)</th>
                    <th>CI Low</th>
                    <th>CI High</th>
                  </tr>
                </thead>
                <tbody>
                  {result.turbines.map((turbine) => (
                    <tr key={turbine.turbine_id}>
                      <td>{turbine.turbine_id}</td>
                      <td>{turbine.yaw_misalignment_deg.toFixed(2)}</td>
                      <td>{turbine.ci_low_deg?.toFixed(2) ?? '—'}</td>
                      <td>{turbine.ci_high_deg?.toFixed(2) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted-text">No yaw results yet.</p>
          )}
        </ChartCard>
      </section>
    </div>
  )
}
