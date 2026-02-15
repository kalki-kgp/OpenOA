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
import { api, ElectricalLossesResponse, WakeLossesResponse } from "../api/client";
import ChartCard from "../components/ChartCard";
import MetricCard from "../components/MetricCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function LossesAnalysis() {
  const [electrical, setElectrical] = useState<ElectricalLossesResponse | null>(null);
  const [wake, setWake] = useState<WakeLossesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalyses = async () => {
    setLoading(true);
    try {
      const [e, w] = await Promise.all([
        api.analysis.electricalLosses({ uncertainty: false }),
        api.analysis.wakeLosses({ wind_direction_data_type: "scada" }),
      ]);
      setElectrical(e);
      setWake(w);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalyses();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: "var(--space-6)" }}>
        Losses Analysis
      </h1>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-10)" }}>
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "var(--space-6)" }}>
            <h2 style={{ fontSize: 18, marginBottom: "var(--space-4)" }}>Electrical Losses</h2>
            {electrical && (
              <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
                <MetricCard title="Loss %" value={`${electrical.loss_percent.toFixed(2)}%`} />
                <MetricCard title="Turbine Energy (kWh)" value={electrical.total_turbine_energy.toLocaleString(undefined, { maximumFractionDigits: 0 })} accent="secondary" />
                <MetricCard title="Meter Energy (kWh)" value={electrical.total_meter_energy.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
              </div>
            )}
          </div>

          <div>
            <h2 style={{ fontSize: 18, marginBottom: "var(--space-4)" }}>Wake Losses</h2>
            {wake && (
              <>
                <div style={{ marginBottom: "var(--space-4)" }}>
                  <MetricCard title="Plant Wake Loss %" value={`${wake.plant_wake_loss_percent.toFixed(2)}%`} />
                </div>
                <ChartCard title="Per-Turbine Wake Losses">
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={wake.turbine_losses} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis dataKey="turbine_id" stroke="var(--text-secondary)" fontSize={12} />
                        <YAxis stroke="var(--text-secondary)" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-md)",
                          }}
                        />
                        <Bar dataKey="wake_loss_pct" fill="var(--accent-primary)" name="Wake Loss %" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
