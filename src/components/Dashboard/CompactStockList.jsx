import { formatINR, formatVolume } from '../../utils/formatters.js'
import { ChangePill } from '../UI/ChangePill.jsx'
import { useApp } from '../../context/AppContext.jsx'

// Dense vertical row list shared by Trending/Most-Active/Sector-Performance-adjacent
// widgets — a lighter-weight alternative to StockCard for supplementary lists where
// a full card grid would be too tall.
export function CompactStockList({ rows }) {
  const { dispatch } = useApp()

  if (!rows.length) return <div className="text-xs text-[var(--text-muted)] py-4 text-center">No data</div>

  return (
    <div className="flex flex-col divide-y divide-[var(--border)]">
      {rows.map(r => (
        <button
          key={r.symbol}
          onClick={() => dispatch({ type: 'OPEN_STOCK_DETAIL', payload: r.symbol })}
          className="flex items-center justify-between gap-2 py-2 text-left hover:bg-[var(--bg-hover)] transition-colors -mx-1 px-1 rounded"
        >
          <div className="min-w-0">
            <div className="font-mono text-xs font-semibold text-[var(--accent)] truncate">{r.symbol}</div>
            <div className="text-[10px] text-[var(--text-muted)]">Vol {formatVolume(r.quote?.volume)}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-xs text-[var(--text-primary)]">{r.quote?.price != null ? formatINR(r.quote.price) : '—'}</div>
            <ChangePill value={r.quote?.changePct} />
          </div>
        </button>
      ))}
    </div>
  )
}
