import { useState, useEffect, memo } from 'react'
import { formatINR, formatVolume, formatChangePct } from '../../utils/formatters.js'
import { computeSMA } from '../../utils/indicators.js'
import { fetchOHLCHistory } from '../../utils/upstoxApi.js'
import { Sparkline } from './Sparkline.jsx'

// Swipe-friendly stock card for mobile grids/lists — the touch-first counterpart
// to StockRow's dense desktop table row. Lazily fetches a short history for its
// own sparkline + buy/sell heuristic on mount (cheap: fetchOHLCHistory is TTL-cached
// and virtualized lists only ever mount the visible cards).
export const StockCard = memo(function StockCard({ stock, quote, isFavorite, onToggleFavorite, onClick, marketCap, extra }) {
  const [closes, setCloses] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchOHLCHistory(stock.yahooSymbol, 20).then(hist => {
      if (!cancelled && hist) setCloses(hist.map(c => c.close).filter(v => v != null))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [stock.yahooSymbol])

  const { text: changeText, color: changeColor } = formatChangePct(quote?.changePct)
  const sma = closes ? computeSMA(closes, closes.length) : null
  const bias = sma != null && quote?.price != null ? (quote.price >= sma ? 'BUY' : 'SELL') : null

  return (
    <div
      onClick={() => onClick?.(stock)}
      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3.5 flex flex-col gap-2.5 cursor-pointer hover:border-[var(--accent)]/50 active:scale-[0.98] transition-all duration-150 min-w-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-sm text-[var(--accent)] truncate">{stock.symbol}</span>
            {bias && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${bias === 'BUY' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                {bias}
              </span>
            )}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] truncate max-w-[140px]">{stock.name}</div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggleFavorite?.(stock.symbol) }}
          className={`text-lg leading-none flex-shrink-0 ${isFavorite ? 'text-yellow-400' : 'text-[var(--text-muted)]'}`}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
            {quote?.price != null ? formatINR(quote.price) : '—'}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold" style={{ color: changeColor }}>
            {changeText}
            {quote?.change != null && <span className="opacity-70">({quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)})</span>}
          </div>
        </div>
        {closes && <Sparkline values={closes} width={72} height={28} />}
      </div>

      {extra && <div className="flex items-center gap-1.5 flex-wrap">{extra}</div>}

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
        <span>Vol {quote?.volume != null ? formatVolume(quote.volume) : '—'}</span>
        <span>{marketCap != null ? `MCap ${marketCap}` : ''}</span>
      </div>
    </div>
  )
})
