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
    <article className={`metric-card ${accent}`}>
      <p className="metric-title">{title}</p>
      <p className="metric-value">{value}</p>
      {subtitle ? <p className="metric-subtitle">{subtitle}</p> : null}
    </article>
  )
}
