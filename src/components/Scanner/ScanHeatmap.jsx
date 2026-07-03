import { StockTile } from '../Heatmap/StockTile.jsx'

// Signal → dot colour (matches this repo's scanner signals).
function signalColor(signal) {
  if (signal === 'STRONG')        return '#00C853'   // Doji + Breakout
  if (signal === 'DOJI ONLY')     return '#FFD700'   // Doji only
  if (signal === 'BREAKOUT ONLY') return '#3b82f6'   // Breakout only
  return 'transparent'
}

const LEGEND = [
  { color: '#00C853', label: 'Doji + Breakout' },
  { color: '#FFD700', label: 'Doji Only' },
  { color: '#3b82f6', label: 'Breakout Only' }
]

export function ScanHeatmap({ scannedStocks }) {
  if (!scannedStocks || scannedStocks.length === 0) return null

  // One flat grid, best % first.
  const sorted = [...scannedStocks].sort((a, b) => (b.changePct ?? -999) - (a.changePct ?? -999))

  return (
    <div className="mt-5 rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
          Scanned Stocks Heatmap
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA', border: '0.5px solid rgba(0,212,170,0.3)' }}>
            {scannedStocks.length} stocks
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
          {LEGEND.map(l => (
            <span key={l.label} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Flat grid — no sector grouping */}
      <div className="flex flex-wrap gap-1.5 p-3 content-start">
        {sorted.map(stock => (
          <div key={stock.symbol} className="relative">
            <StockTile stock={{ ...stock, quote: { changePct: stock.changePct, price: stock.currentPrice } }} />
            <span
              className="absolute rounded-full"
              style={{ top: 3, right: 3, width: 6, height: 6, background: signalColor(stock.signal), zIndex: 1, pointerEvents: 'none' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
