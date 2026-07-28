// Minimal inline-SVG sparkline — no charting library, matches the hand-rolled
// SVG pattern already used by NiftyFIICard.jsx / SentimentGauge.jsx.
export function Sparkline({ values, width = 80, height = 28, strokeWidth = 1.5 }) {
  const clean = (values ?? []).filter(v => v != null && !isNaN(v))
  if (clean.length < 2) {
    return <div style={{ width, height }} className="flex items-center justify-center text-[10px] text-[var(--text-muted)]">—</div>
  }

  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const range = max - min || 1
  const stepX = width / (clean.length - 1)
  const points = clean.map((v, i) => `${(i * stepX).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`)
  const up = clean[clean.length - 1] >= clean[0]
  const color = up ? 'var(--green)' : 'var(--red)'

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
