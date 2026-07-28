// Shared widget shell so every Dashboard card gets the same rounded/padding/
// header treatment — only the 2-3 headline cards opt into the gradient accent.
export function DashboardCard({ title, icon, action, gradient = false, className = '', children }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] p-4 flex flex-col gap-3 ${className}`}
      style={gradient
        ? { background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--bg-card)), var(--bg-card))' }
        : { background: 'var(--bg-card)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          {icon && <span>{icon}</span>} {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export function ViewAllButton({ onClick, label = 'View all' }) {
  return (
    <button onClick={onClick} className="text-xs text-[var(--accent)] hover:underline flex-shrink-0">
      {label} →
    </button>
  )
}
