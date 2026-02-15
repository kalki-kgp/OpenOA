import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, Line } from 'recharts'

import { api, type PowerCurveResponse, type TurbineInfo } from '../api/client'
import { ChartCard } from '../components/ChartCard'
import { LoadingSpinner } from '../components/LoadingSpinner'

export function PowerCurves() {
  const [turbines, setTurbines] = useState<TurbineInfo[]>([])
  const [turbineId, setTurbineId] = useState('')
  const [method, setMethod] = useState<'IEC' | 'logistic_5' | 'gam'>('IEC')
  const [data, setData] = useState<PowerCurveResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const boot = async () => {
      setLoading(true)
      try {
        const turbineRes = await api.getTurbines()
        setTurbines(turbineRes)
        setTurbineId(turbineRes[0]?.turbine_id ?? '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load turbines')
      } finally {
        setLoading(false)
      }
    }

    void boot()
  }, [])

  useEffect(() => {
    if (!turbineId) return

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.runPowerCurve({ turbine_id: turbineId, method })
        setData(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Power curve run failed')
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [turbineId, method])

  const chartData = useMemo(() => {
    if (!data) return []
    return data.curve.map((point) => ({
      ws: point.wind_speed_ms,
      curve: point.power_kw
    }))
  }, [data])

  if (loading && !data) return <LoadingSpinner label="Running power curve" />

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Power Curves</h2>
          <p>Scatter performance and fitted power models by turbine.</p>
        </div>
      </header>

      <section className="control-row">
        <label>
          Turbine
          <select value={turbineId} onChange={(event) => setTurbineId(event.target.value)}>
            {turbines.map((item) => (
              <option key={item.turbine_id} value={item.turbine_id}>
                {item.turbine_id}
              </option>
            ))}
          </select>
        </label>

        <label>
          Method
          <select value={method} onChange={(event) => setMethod(event.target.value as 'IEC' | 'logistic_5' | 'gam')}>
            <option value="IEC">IEC</option>
            <option value="logistic_5">Logistic 5</option>
            <option value="gam">GAM</option>
          </select>
        </label>
      </section>

      {error ? <p className="error-text">{error}</p> : null}

      <section className="split-grid">
        <ChartCard title="Power Curve Fit" subtitle="Wind speed vs. power (kW)">
          <div className="chart-height-lg">
            <ResponsiveContainer>
              <ScatterChart>
                <XAxis type="number" dataKey="wind_speed_ms" name="Wind Speed" unit="m/s" tick={{ fill: '#9ba8b4', fontSize: 11 }} />
                <YAxis type="number" dataKey="power_kw" name="Power" unit="kW" tick={{ fill: '#9ba8b4', fontSize: 11 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                {data ? <Scatter data={data.scatter} fill="#145f73" /> : null}
                <Line type="monotone" data={chartData} dataKey="curve" stroke="#00d4aa" dot={false} strokeWidth={2} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Fit Metrics" subtitle="Model quality statistics">
          {data ? (
            <div className="stats-stack">
              <div className="stat-line">
                <span>Samples</span>
                <strong>{data.stats.n_samples.toLocaleString()}</strong>
              </div>
              <div className="stat-line">
                <span>R²</span>
                <strong>{data.stats.r2.toFixed(3)}</strong>
              </div>
              <div className="stat-line">
                <span>RMSE</span>
                <strong>{data.stats.rmse_kw.toFixed(1)} kW</strong>
              </div>
              <div className="stat-line">
                <span>Method</span>
                <strong>{data.method}</strong>
              </div>
            </div>
          ) : (
            <p className="muted-text">No result available.</p>
          )}
        </ChartCard>
      </section>
    </div>
  )
}
