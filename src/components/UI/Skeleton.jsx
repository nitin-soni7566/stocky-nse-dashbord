export function SkeletonRow({ cols = 10 }) {
  return (
    <tr className="border-b border-[var(--border)]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-4 space-y-3">
      <div className="skeleton h-5 rounded w-1/3" />
      <div className="skeleton h-4 rounded w-2/3" />
      <div className="skeleton h-4 rounded w-1/2" />
    </div>
  )
}
