import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api, TurbineInfo, PowerCurveResponse } from "../api/client";
import ChartCard from "../components/ChartCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function PowerCurves() {
  const [turbines, setTurbines] = useState<TurbineInfo[]>([]);
  const [selectedTurbine, setSelectedTurbine] = useState<string>("");
  const [method, setMethod] = useState<string>("IEC");
  const [result, setResult] = useState<PowerCurveResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.plant.turbines().then((t) => {
      setTurbines(t);
      setSelectedTurbine(t[0]?.asset_id ?? "");
    });
  }, []);

  useEffect(() => {
    if (!selectedTurbine) return;
    setLoading(true);
    api.analysis
      .powerCurve({ turbine_id: selectedTurbine, method })
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [selectedTurbine, method]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: "var(--space-6)" }}>
        Power Curves
      </h1>

      <div style={{ marginBottom: "var(--space-4)", display: "flex", gap: "var(--space-4)" }}>
        <div>
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
            }}
          >
            {turbines.map((t) => (
              <option key={t.asset_id} value={t.asset_id}>
                {t.asset_id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ marginRight: "var(--space-2)", color: "var(--text-secondary)" }}>Method:</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{
              padding: "var(--space-2) var(--space-3)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
            }}
          >
            <option value="IEC">IEC Binned</option>
            <option value="logistic_5">Logistic 5-Param</option>
            <option value="gam">GAM</option>
          </select>
        </div>
      </div>

      <ChartCard title="Power Curve">
        {loading ? (
          <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LoadingSpinner />
          </div>
        ) : result ? (
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="wind_speed" name="Wind Speed" stroke="var(--text-secondary)" />
                <YAxis dataKey="power" name="Power" stroke="var(--text-secondary)" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                  }}
                />
                <Scatter data={result.scatter_data} fill="var(--accent-primary)" fillOpacity={0.4} name="Observed" />
                <Scatter data={result.fitted_curve} fill="var(--accent-secondary)" line name="Fitted" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            No data
          </div>
        )}
      </ChartCard>
    </motion.div>
  );
}
