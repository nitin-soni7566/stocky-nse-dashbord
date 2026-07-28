// Continuous (not bucketed) heat-color scale for change% — used by StockTile and
// SectorBlock so heatmaps read as a smooth gradient rather than 6 discrete steps.
export function getHeatColor(pct, range = 5) {
  if (pct == null) return '#2A2A2A'
  const clamped = Math.max(-range, Math.min(range, pct))
  const t = Math.abs(clamped) / range               // 0..1 intensity
  const isPos = clamped >= 0
  const hue = isPos ? 152 : 4                        // matches --green / --red
  const sat = 50 + t * 30
  const light = 20 + t * 18
  return `hsl(${hue} ${sat}% ${light}%)`
}

export function getHeatTextColor(pct) {
  if (pct == null) return '#555555'
  return Math.abs(pct) > 1 ? '#ffffff' : '#E8F8F0'
}
