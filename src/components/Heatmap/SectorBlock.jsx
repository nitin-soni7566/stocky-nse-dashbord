import { StockTile } from './StockTile.jsx'
import { formatChange } from '../../utils/formatters.js'

function getSectorHeaderColor(avg) {
  if (avg == null) return 'text-[var(--text-muted)]'
  if (avg > 0) return 'text-[var(--green)]'
  if (avg < 0) return 'text-[var(--red)]'
  return 'text-[var(--text-muted)]'
}

export function SectorBlock({ sector, stocks, avgChange, count, onClick }) {
  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden cursor-pointer hover:border-[var(--accent)]/50 transition-colors"
      onClick={() => onClick({ sector, stocks })}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{sector}</span>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className={`text-xs font-mono font-bold ${getSectorHeaderColor(avgChange)}`}>
            {avgChange != null ? formatChange(avgChange, true) : '—'}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{count}</span>
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
