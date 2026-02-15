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
import { api, YawMisalignmentResponse } from "../api/client";
import ChartCard from "../components/ChartCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function YawAnalysis() {
  const [result, setResult] = useState<YawMisalignmentResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analysis
      .yawMisalignment({})
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, []);

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
        Static Yaw Misalignment
      </h1>

      <ChartCard title="Per-Turbine Yaw Misalignment (degrees)">
        {result && result.turbine_results.length > 0 ? (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.turbine_results} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                <Bar dataKey="yaw_misalignment_deg" fill="var(--accent-secondary)" name="Yaw Misalignment (°)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            No results available
          </div>
        )}
      </ChartCard>
    </motion.div>
  );
}
