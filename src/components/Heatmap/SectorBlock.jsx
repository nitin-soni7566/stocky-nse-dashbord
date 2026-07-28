import { StockTile } from './StockTile.jsx'
import { formatChange } from '../../utils/formatters.js'
import { getHeatColor, getHeatTextColor } from '../../utils/heatColor.js'

export function SectorBlock({ sector, stocks, avgChange, count, onExpand, onTileClick }) {
  const bg = getHeatColor(avgChange, 3)
  const fg = getHeatTextColor(avgChange)

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--accent)]/50 transition-colors">
      {/* Sector heat header: % on top, sector name below */}
      <div
        className="px-3 py-2 text-center border-b border-[var(--border)] cursor-pointer transition-colors"
        style={{ backgroundColor: bg, color: fg }}
        onClick={() => onExpand({ sector, stocks })}
      >
        <div className="text-sm font-mono font-bold leading-tight">
          {avgChange != null ? formatChange(avgChange, true) : '—'}
        </div>
        <div className="text-[11px] font-semibold truncate">
          {sector} <span className="opacity-70">({count})</span>
        </div>
      </div>
      <div className="p-2 flex flex-wrap gap-1">
        {stocks.slice(0, 24).map(stock => (
          <StockTile key={stock.symbol} stock={stock} onClick={onTileClick} />
        ))}
        {stocks.length > 24 && (
          <button
            onClick={() => onExpand({ sector, stocks })}
            className="rounded-md flex items-center justify-center text-xs text-[var(--text-muted)] hover:text-[var(--accent)] border border-dashed border-[var(--border)]"
            style={{ width: 112, minHeight: 62 }}
          >
            +{stocks.length - 24} more
          </button>
        )}
      </div>
    </div>
  )
}
