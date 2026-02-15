import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { api, TurbineInfo, ScadaPoint, WindRoseBin } from "../api/client";
import ChartCard from "../components/ChartCard";
import WindRose from "../components/WindRose";
import LoadingSpinner from "../components/LoadingSpinner";

export default function DataExplorer() {
  const [turbines, setTurbines] = useState<TurbineInfo[]>([]);
  const [selectedTurbine, setSelectedTurbine] = useState<string>("");
  const [scadaData, setScadaData] = useState<ScadaPoint[]>([]);
  const [windRose, setWindRose] = useState<WindRoseBin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    api.plant.turbines().then((t) => {
      setTurbines(t);
      setSelectedTurbine(t[0]?.asset_id ?? "");
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTurbine) return;
    setLoadingData(true);
    Promise.all([
      api.data.scada({ turbine_id: selectedTurbine, resample: "1h" }),
      api.data.windRose(selectedTurbine),
    ])
      .then(([s, w]) => {
        setScadaData(s.data);
        setWindRose(w.bins);
      })
      .finally(() => setLoadingData(false));
  }, [selectedTurbine]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: "var(--space-6)" }}>
        Data Explorer
      </h1>

      <div style={{ marginBottom: "var(--space-4)" }}>
        <label style={{ marginRight: "var(--space-2)", color: "var(--text-secondary)" }}>Turbine:</label>
        <select
          value={selectedTurbine}
          onChange={(e) => setSelectedTurbine(e.target.value)}
          style={{
            padding: "var(--space-2) var(--space-3)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {turbines.map((t) => (
            <option key={t.asset_id} value={t.asset_id}>
              {t.asset_id}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-6)" }}>
        <ChartCard title="SCADA Time Series">
          {loadingData ? (
            <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LoadingSpinner />
            </div>
          ) : (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scadaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={11} tickFormatter={(v) => v.slice(0, 16)} />
                  <YAxis yAxisId="left" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                    }}
                    labelFormatter={(v) => v}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="power_kw" stroke="var(--accent-primary)" dot={false} name="Power (kW)" />
                  <Line yAxisId="right" type="monotone" dataKey="wind_speed" stroke="var(--chart-2)" dot={false} name="Wind Speed (m/s)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Wind Rose">
          {loadingData ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LoadingSpinner />
            </div>
          ) : (
            <WindRose bins={windRose} size={260} />
          )}
        </ChartCard>
      </div>
    </motion.div>
  );
}
