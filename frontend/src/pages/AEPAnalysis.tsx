import { useState } from "react";
import { motion } from "framer-motion";
import { api, AEPResults } from "../api/client";
import ChartCard from "../components/ChartCard";
import MetricCard from "../components/MetricCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function AEPAnalysis() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AEPResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regModel, setRegModel] = useState("lin");
  const [timeRes, setTimeRes] = useState("MS");

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await api.analysis.aep({ reg_model: regModel, time_resolution: timeRes });
      if (res.status === "completed" && res.results) {
        setResults(res.results);
      } else if (res.status === "running") {
        const poll = async () => {
          const status = await api.analysis.aepStatus(res.task_id);
          if (status.status === "completed" && status.results) {
            setResults(status.results);
            setLoading(false);
          } else if (status.status === "failed") {
            setError(status.error ?? "Analysis failed");
            setLoading(false);
          } else {
            setTimeout(poll, 2000);
          }
        };
        poll();
      } else if (res.status === "failed") {
        setError(res.error ?? "Analysis failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: "var(--space-6)" }}>
        AEP Analysis
      </h1>

      <ChartCard title="Configuration">
        <div style={{ display: "flex", gap: "var(--space-6)", marginBottom: "var(--space-4)" }}>
          <div>
            <label style={{ display: "block", marginBottom: "var(--space-2)", color: "var(--text-secondary)" }}>
              Regression Model
            </label>
            <select
              value={regModel}
              onChange={(e) => setRegModel(e.target.value)}
              style={{
                padding: "var(--space-2) var(--space-3)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
              }}
            >
              <option value="lin">Linear</option>
              <option value="gam">GAM</option>
              <option value="gbm">GBM</option>
              <option value="etr">Extra Trees</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "var(--space-2)", color: "var(--text-secondary)" }}>
              Time Resolution
            </label>
            <select
              value={timeRes}
              onChange={(e) => setTimeRes(e.target.value)}
              style={{
                padding: "var(--space-2) var(--space-3)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
              }}
            >
              <option value="MS">Monthly</option>
              <option value="D">Daily</option>
              <option value="h">Hourly</option>
            </select>
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          style={{
            padding: "var(--space-3) var(--space-5)",
            background: loading ? "var(--text-muted)" : "var(--accent-primary)",
            color: "var(--bg-primary)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
              <LoadingSpinner /> Running (may take 2-5 min)...
            </span>
          ) : (
            "Run AEP Analysis"
          )}
        </button>
      </ChartCard>

      {error && (
        <div style={{ color: "var(--accent-secondary)", padding: "var(--space-4)", marginTop: "var(--space-4)" }}>
          {error}
        </div>
      )}

      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "var(--space-4)",
            marginTop: "var(--space-6)",
          }}
        >
          <MetricCard title="AEP (GWh)" value={results.aep_gwh.toFixed(2)} />
          <MetricCard title="Availability %" value={results.availability_pct.toFixed(2)} accent="secondary" />
          <MetricCard title="Curtailment %" value={results.curtailment_pct.toFixed(2)} />
          <MetricCard title="R²" value={results.r2.toFixed(3)} />
        </motion.div>
      )}
    </motion.div>
  );
}
