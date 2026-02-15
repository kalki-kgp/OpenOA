import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { api, type MonthlyEnergyPoint, type PlantSummary, type TurbineInfo, type WindRoseResponse } from '../api/client'
import { ChartCard } from '../components/ChartCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { MetricCard } from '../components/MetricCard'
import { TurbineTable } from '../components/TurbineTable'
import { WindRose } from '../components/WindRose'

export function Dashboard() {
  const [summary, setSummary] = useState<PlantSummary | null>(null)
  const [turbines, setTurbines] = useState<TurbineInfo[]>([])
  const [monthly, setMonthly] = useState<MonthlyEnergyPoint[]>([])
  const [windRose, setWindRose] = useState<WindRoseResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [summaryRes, turbinesRes, monthlyRes, windRoseRes] = await Promise.all([
          api.getPlantSummary(),
          api.getTurbines(),
          api.getMonthlyEnergy(),
          api.getWindRose({ direction_bins: 12 })
        ])

        setSummary(summaryRes)
        setTurbines(turbinesRes)
        setMonthly(monthlyRes.points)
        setWindRose(windRoseRes)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const dateRange = useMemo(() => {
    if (!summary) return '—'
    const start = new Date(summary.date_start).toLocaleDateString()
    const end = new Date(summary.date_end).toLocaleDateString()
    return `${start} – ${end}`
  }, [summary])

  const chartData = monthly.map((entry) => ({
    month: new Date(entry.month).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
    energy: Number(entry.energy_mwh.toFixed(1))
  }))

  if (loading) return <LoadingSpinner label="Loading dashboard" />
  if (error) return <p className="error-text">{error}</p>
  if (!summary) return <p className="error-text">No summary data found.</p>

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Plant Dashboard</h2>
          <p>Operational overview and plant health for {summary.name}</p>
        </div>
      </header>

      <section className="metrics-grid">
        <MetricCard title="Capacity" value={`${summary.capacity_mw.toFixed(1)} MW`} accent="cyan" subtitle="Installed nameplate" />
        <MetricCard title="Turbines" value={`${summary.turbine_count}`} accent="amber" subtitle="Operational assets" />
        <MetricCard title="Date Range" value={dateRange} accent="frost" subtitle="SCADA period of record" />
        <MetricCard title="Avg Wind Speed" value={`${summary.avg_wind_speed_ms.toFixed(2)} m/s`} accent="mint" subtitle="Across full dataset" />
      </section>

      <section className="single-grid">
        <ChartCard title="Monthly Energy" subtitle="Metered net production (MWh)">
          <div className="chart-height-lg">
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fill: '#9ba8b4', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ba8b4', fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="energy" fill="url(#energyGradient)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4aa" />
                    <stop offset="100%" stopColor="#145f73" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className="split-grid">
        <ChartCard title="Turbine Assets" subtitle="Core turbine specs">
          <TurbineTable data={turbines} />
        </ChartCard>

        <ChartCard title="Wind Rose" subtitle="Directional wind frequency preview">
          {windRose ? <WindRose data={windRose} compact /> : <p className="muted-text">No wind rose data</p>}
        </ChartCard>
      </section>
    </div>
  )
}
