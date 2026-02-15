export function ChartCard({
  title,
  subtitle,
  children,
  action,
  className
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <section className={`chart-card ${className ?? ''}`}>
      <header className="chart-card-header">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action ? <div className="chart-card-action">{action}</div> : null}
      </header>
      <div className="chart-card-body">{children}</div>
    </section>
  )
}
