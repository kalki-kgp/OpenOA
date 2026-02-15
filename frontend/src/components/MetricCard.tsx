import { motion } from "framer-motion";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "primary" | "secondary";
  delay?: number;
}

export default function MetricCard({ title, value, subtitle, accent = "primary", delay = 0 }: MetricCardProps) {
  const accentColor = accent === "primary" ? "var(--accent-primary)" : "var(--accent-secondary)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        borderBottom: `3px solid ${accentColor}`,
      }}
    >
      <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: "var(--space-2)" }}>
        {title}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 600 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: "var(--space-1)" }}>
          {subtitle}
        </div>
      )}
    </motion.div>
  );
}
