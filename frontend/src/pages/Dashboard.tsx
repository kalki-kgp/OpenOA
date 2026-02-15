import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api, PlantSummary, TurbineInfo, MonthlyEnergyPoint, WindRoseBin } from "../api/client";
import MetricCard from "../components/MetricCard";
import ChartCard from "../components/ChartCard";
import TurbineTable from "../components/TurbineTable";
import WindRose from "../components/WindRose";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Dashboard() {
  const [summary, setSummary] = useState<PlantSummary | null>(null);
  const [turbines, setTurbines] = useState<TurbineInfo[]>([]);
  const [monthlyEnergy, setMonthlyEnergy] = useState<MonthlyEnergyPoint[]>([]);
  const [windRose, setWindRose] = useState<WindRoseBin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t, m, w] = await Promise.all([
          api.plant.summary(),
          api.plant.turbines(),
          api.data.monthlyEnergy(),
          api.data.windRose(),
        ]);
        setSummary(s);
        setTurbines(t);
        setMonthlyEnergy(m.data);
        setWindRose(w.bins);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: "var(--accent-secondary)", padding: "var(--space-6)" }}>
        Error: {error}
      </div>
    );
  }

  const dateRange = summary
    ? `${new Date(summary.date_range_start).toLocaleDateString()} – ${new Date(summary.date_range_end).toLocaleDateString()}`
    : "—";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: "var(--space-6)" }}>
        {summary?.name ?? "OpenOA"} Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-6)",
        }}
      >
        <MetricCard title="Plant Capacity" value={`${summary?.capacity_mw ?? 0} MW`} delay={0.1} />
        <MetricCard title="Turbines" value={summary?.turbine_count ?? 0} delay={0.15} />
        <MetricCard title="Date Range" value={dateRange} subtitle="Period of record" delay={0.2} />
        <MetricCard title="Location" value={`${summary?.latitude?.toFixed(2)}°, ${summary?.longitude?.toFixed(2)}°`} accent="secondary" delay={0.25} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "var(--space-6)",
          marginBottom: "var(--space-6)",
        }}
      >
        <ChartCard title="Monthly Energy Production (MWh)" delay={0.3}>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyEnergy} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                  }}
                  labelStyle={{ color: "var(--text-primary)" }}
                />
                <Bar dataKey="energy_mwh" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Wind Rose" delay={0.35}>
          <WindRose bins={windRose} size={220} />
        </ChartCard>
      </div>

      <ChartCard title="Turbine Assets" delay={0.4}>
        <TurbineTable turbines={turbines} />
      </ChartCard>
    </motion.div>
  );
}
