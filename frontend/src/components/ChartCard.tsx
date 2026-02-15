import { ReactNode } from "react";
import { motion } from "framer-motion";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  delay?: number;
}

export default function ChartCard({ title, children, delay = 0 }: ChartCardProps) {
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
        overflow: "hidden",
      }}
    >
      <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: "var(--space-4)", color: "var(--text-primary)" }}>
        {title}
      </h3>
      {children}
    </motion.div>
  );
}
