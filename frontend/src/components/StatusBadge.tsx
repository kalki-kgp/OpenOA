export function StatusBadge({
  tone,
  children
}: {
  tone: 'ok' | 'warn' | 'error' | 'idle'
  children: React.ReactNode
}) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}
