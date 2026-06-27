export function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
    green: 'bg-green-900/40 text-green-400',
    red: 'bg-red-900/40 text-red-400',
    accent: 'bg-teal-900/40 text-[var(--accent)]',
    blue: 'bg-blue-900/40 text-blue-400',
    yellow: 'bg-yellow-900/40 text-yellow-400'
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant] ?? variants.default}`}>
      {children}
    </span>
  )
}
