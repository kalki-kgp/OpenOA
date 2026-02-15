export function LoadingSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading-wrap" role="status" aria-live="polite">
      <span className="loading-orbit" />
      <span>{label}</span>
    </div>
  )
}
