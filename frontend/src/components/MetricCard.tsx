import { motion } from 'framer-motion'

export function MetricCard({
  title,
  value,
  accent,
  subtitle
}: {
  title: string
  value: string
  accent: 'cyan' | 'amber' | 'frost' | 'mint'
  subtitle?: string
}) {
  return (
    <motion.article
      className={`metric-card ${accent}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <p className="metric-title">{title}</p>
      <p className="metric-value">{value}</p>
      {subtitle ? <p className="metric-subtitle">{subtitle}</p> : null}
    </motion.article>
  )
}
