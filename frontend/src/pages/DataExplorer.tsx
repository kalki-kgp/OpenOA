import { useEffect, useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { api, type ScadaPoint, type TurbineInfo, type WindRoseResponse } from '../api/client'
import { ChartCard } from '../components/ChartCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { WindRose } from '../components/WindRose'

export function DataExplorer() {
  const [turbines, setTurbines] = useState<TurbineInfo[]>([])
  const [selectedTurbine, setSelectedTurbine] = useState<string>('')
  const [resample, setResample] = useState('1h')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')

  const [scada, setScada] = useState<ScadaPoint[]>([])
  const [windRose, setWindRose] = useState<WindRoseResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const turbineRes = await api.getTurbines()
        setTurbines(turbineRes)
        setSelectedTurbine(turbineRes[0]?.turbine_id ?? '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load turbines')
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [])

  useEffect(() => {
    if (!selectedTurbine) return

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const [scadaRes, windRoseRes] = await Promise.all([
          api.getScada({ turbine_id: selectedTurbine, start: start || undefined, end: end || undefined, resample }),
          api.getWindRose({ turbine_id: selectedTurbine, start: start || undefined, end: end || undefined, direction_bins: 24 })
        ])
        setScada(scadaRes.points)
        setWindRose(windRoseRes)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data explorer content')
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [selectedTurbine, resample, start, end])

  const chartData = useMemo(
    () =>
      scada.map((point) => ({
        time: new Date(point.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        power: point.power_kw,
        ws: point.wind_speed_ms
      })),
    [scada]
  )

  if (loading && !scada.length) return <LoadingSpinner label="Loading data explorer" />

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Data Explorer</h2>
          <p>Inspect SCADA time series and directional wind behavior.</p>
        </div>
      </header>

      <section className="control-row">
        <label>
          Turbine
          <select value={selectedTurbine} onChange={(event) => setSelectedTurbine(event.target.value)}>
            {turbines.map((turbine) => (
              <option key={turbine.turbine_id} value={turbine.turbine_id}>
                {turbine.turbine_id}
              </option>
            ))}
          </select>
        </label>

        <label>
          Resample
          <select value={resample} onChange={(event) => setResample(event.target.value)}>
            <option value="10min">10min</option>
            <option value="1h">1h</option>
            <option value="1D">1D</option>
          </select>
        </label>

        <label>
          Date From
          <input type="date" value={draftStart} onChange={(event) => setDraftStart(event.target.value)} />
        </label>

        <label>
          Date To
          <input type="date" value={draftEnd} onChange={(event) => setDraftEnd(event.target.value)} />
        </label>

        <button
          className="button-primary"
          onClick={() => {
            setStart(draftStart)
            setEnd(draftEnd)
          }}
        >
          Apply Dates
        </button>

        <button
          className="button-ghost"
          onClick={() => {
            setDraftStart('')
            setDraftEnd('')
            setStart('')
            setEnd('')
          }}
        >
          Clear Dates
        </button>
      </section>

      {error ? <p className="error-text">{error}</p> : null}

      <section className="split-grid">
        <ChartCard title="Power + Wind Speed" subtitle="Power (kW) with wind speed (m/s) overlay">
          <div className="chart-height-lg">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fill: '#9ba8b4', fontSize: 11 }} minTickGap={18} />
                <YAxis yAxisId="power" tick={{ fill: '#9ba8b4', fontSize: 11 }} />
                <YAxis yAxisId="ws" orientation="right" tick={{ fill: '#9ba8b4', fontSize: 11 }} />
                <Tooltip />
                <Line yAxisId="power" dataKey="power" stroke="#00d4aa" dot={false} strokeWidth={2} />
                <Line yAxisId="ws" dataKey="ws" stroke="#f5a623" dot={false} strokeWidth={1.8} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Wind Rose" subtitle="Directional frequency by wind speed bins">
          {windRose ? <WindRose data={windRose} /> : <p className="muted-text">No wind rose data available.</p>}
        </ChartCard>
      </section>
    </div>
  )
}
