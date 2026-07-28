import { useState, useEffect } from 'react'
import { fetchBulkQuotes, fetchOHLCHistory } from '../../utils/upstoxApi.js'
import { findStock } from '../../utils/instruments.js'
import { formatINR, formatVolume, formatChangePct } from '../../utils/formatters.js'
import { useWatchlist } from '../../hooks/useWatchlist.js'
import { Sparkline } from '../UI/Sparkline.jsx'

// Shared slide-in drawer for a single stock's detail — opened by symbol from
// any tile/card/row in the app (heatmap, scanner, dashboard, watchlist...).
export function StockDetailDrawer({ symbol, onClose }) {
  const stock = findStock(symbol)
  const [quote, setQuote] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const { isFavorite, toggle } = useWatchlist()

  useEffect(() => {
    if (!stock) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchBulkQuotes([stock.yahooSymbol]),
      fetchOHLCHistory(stock.yahooSymbol, 30)
    ]).then(([quotes, hist]) => {
      if (cancelled) return
      setQuote(quotes[stock.yahooSymbol] ?? null)
      setHistory(hist)
      setLoading(false)
    }).catch(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [symbol])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!stock) return null

  const { text: changeText, color: changeColor } = formatChangePct(quote?.changePct)
  const fav = isFavorite(stock.symbol)

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="drawer-enter bg-[var(--bg-secondary)] border-l border-[var(--border)] flex flex-col shadow-2xl" style={{ width: '100%', maxWidth: 440 }}>
        <div className="flex items-start gap-3 px-4 py-4 border-b border-[var(--border)] flex-shrink-0">
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl font-bold mt-0.5">✕</button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg text-[var(--text-primary)]">{stock.symbol}</span>
              <button
                onClick={() => toggle(stock.symbol)}
                title={fav ? 'Remove from watchlist' : 'Add to watchlist'}
                className={`text-lg leading-none transition-colors ${fav ? 'text-yellow-400' : 'text-[var(--text-muted)] hover:text-yellow-400'}`}
              >
                {fav ? '★' : '☆'}
              </button>
            </div>
            <div className="text-xs text-[var(--text-muted)] truncate">{stock.name}</div>
            {stock.sector && <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{stock.sector}</div>}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-5">
          {loading ? (
            <div className="space-y-3">
              <div className="skeleton rounded-lg h-16" />
              <div className="skeleton rounded-lg h-28" />
              <div className="skeleton rounded-lg h-24" />
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-mono text-3xl font-bold text-[var(--text-primary)]">
                    {quote?.price != null ? formatINR(quote.price) : '—'}
                  </div>
                  <div className="font-mono text-sm font-semibold mt-1" style={{ color: changeColor }}>{changeText}</div>
                </div>
                {history && <Sparkline values={history.map(c => c.close)} width={120} height={40} />}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Open', quote?.open], ['Prev Close', quote?.prevClose],
                  ['High', quote?.high], ['Low', quote?.low]
                ].map(([label, val]) => (
                  <div key={label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
                    <div className="font-mono text-sm text-[var(--text-primary)] mt-1">{val != null ? formatINR(val) : '—'}</div>
                  </div>
                ))}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 col-span-2">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Volume</div>
                  <div className="font-mono text-sm text-[var(--text-primary)] mt-1">{quote?.volume != null ? formatVolume(quote.volume) : '—'}</div>
                </div>
              </div>

              {history && history.length > 1 && (
                <div>
                  <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">30-Day Trend</div>
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3">
                    <Sparkline values={history.map(c => c.close)} width={360} height={80} strokeWidth={2} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
