import { formatChangePct } from '../../utils/formatters.js'

export function ChangePill({ value }) {
  if (value == null || isNaN(value)) {
    return <span className="font-mono text-[var(--text-muted)] text-xs">—</span>
  }
  const { text, color } = formatChangePct(value)
  const bg = value > 0 ? '#0d2818' : value < 0 ? '#2b0d0d' : '#1a1a1a'
  return (
    <span style={{
      background: bg,
      color,
      padding: '2px 8px',
      borderRadius: '12px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      whiteSpace: 'nowrap',
      fontWeight: 600
    }}>
      {text}
    </span>
  )
}

export function ChangeText({ value }) {
  if (value == null || isNaN(value)) return <span className="text-[var(--text-muted)]">—</span>
  const color = value > 0 ? '#00C853' : value < 0 ? '#FF3D3D' : '#888888'
  const sign = value > 0 ? '+' : ''
  return (
    <span style={{ color, fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace" }}>
      {sign}{value.toFixed(2)}
    </span>
  )
}
