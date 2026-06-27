export function ScanProgress({ progress, timeRemaining, onCancel }) {
  const { current, total } = progress
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text-secondary)]">
          Scanning <span className="font-mono font-semibold text-[var(--text-primary)]">{current}</span> / {total} stocks...
        </span>
        {timeRemaining != null && (
          <span className="text-xs text-[var(--text-muted)]">~{timeRemaining}s remaining</span>
        )}
      </div>

      <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">{pct}% complete</span>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs rounded border border-red-800 text-red-400 hover:bg-red-900/20 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
