import { StockTile } from './StockTile.jsx'
import { formatChange } from '../../utils/formatters.js'

// Same discrete heat scale as StockTile, so sector headers read as heat tiles.
function getSectorColor(avg) {
  if (avg == null) return '#2A2A2A'
  if (avg < -3) return '#7F0000'
  if (avg < -1) return '#C0392B'
  if (avg < 0) return '#922B21'
  if (avg < 1) return '#1E8449'
  if (avg < 3) return '#27AE60'
  return '#0B5E2A'
}

function getSectorTextColor(avg) {
  if (avg == null) return '#888888'
  return Math.abs(avg) > 1 ? '#ffffff' : '#E8F8F0'
}

export function SectorBlock({ sector, stocks, avgChange, count, onClick }) {
  const bg = getSectorColor(avgChange)
  const fg = getSectorTextColor(avgChange)

  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden cursor-pointer hover:border-[var(--accent)]/50 transition-colors"
      onClick={() => onClick({ sector, stocks })}
    >
      {/* Sector heat tile: % on top, sector name below */}
      <div className="px-3 py-2 text-center border-b border-[var(--border)]" style={{ backgroundColor: bg, color: fg }}>
        <div className="text-sm font-mono font-bold leading-tight">
          {avgChange != null ? formatChange(avgChange, true) : '—'}
        </div>
        <div className="text-[11px] font-semibold truncate">
          {sector} <span className="opacity-70">({count})</span>
        </div>
      </div>
      <div className="p-2 flex flex-wrap gap-1">
        {stocks.map(stock => (
          <StockTile key={stock.symbol} stock={stock} />
        ))}
      </div>
    </div>
  )
}
