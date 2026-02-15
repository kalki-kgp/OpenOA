export function LoadingOverlay({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="page-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="page-overlay-panel">
        <span className="loading-orbit" />
        <span>{label}</span>
      </div>
    </div>
  )
}
