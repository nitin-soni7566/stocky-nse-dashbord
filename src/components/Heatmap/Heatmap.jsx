import { useState, useEffect, useMemo } from 'react'
import { fetchBulkQuotes } from '../../utils/upstoxApi.js'
import { IndexCard } from './IndexCard.jsx'
import { IndexDrawer } from './IndexDrawer.jsx'
import { StockTile } from './StockTile.jsx'
import { useStockData } from '../../hooks/useStockData.js'
import { ErrorBoundary } from '../UI/ErrorBoundary.jsx'
import nifty200 from '../../data/nifty200.json'
import nifty500 from '../../data/nifty500.json'
import niftyFO from '../../data/niftyFO.json'

const NSE_INDICES = [
  { symbol: '^CNXAUTO', name: 'NIFTY AUTO' },
  { symbol: '^CNXFMCG', name: 'NIFTY FMCG' },
  { symbol: '^CNXPHARMA', name: 'NIFTY PHARMA' },
  { symbol: '^CNXIT', name: 'NIFTY IT' },
  { symbol: '^NSEBANK', name: 'NIFTY BANK' },
  { symbol: '^CNXREALTY', name: 'NIFTY REALTY' },
  { symbol: '^CNXINFRA', name: 'NIFTY INFRA' },
  { symbol: '^CNXENERGY', name: 'NIFTY ENERGY' },
  { symbol: '^CNXMETAL', name: 'NIFTY METAL' },
  { symbol: '^CNXMEDIA', name: 'NIFTY MEDIA' },
  { symbol: '^CNXPSUBANK', name: 'NIFTY PSU BANK' },
  { symbol: '^CNXPVTBANK', name: 'NIFTY PVT BANK' },
  { symbol: '^NIFTY_FIN_SERVICE', name: 'NIFTY FIN SERVICE' },
  { symbol: '^CNXFIN', name: 'NIFTY FINANCIAL' },
  { symbol: '^NSEI', name: 'NIFTY 50' },
  { symbol: '^CNX100', name: 'NIFTY 100' },
  { symbol: '^CNX500', name: 'NIFTY 500' },
  { symbol: 'NIFTYIND.NS', name: 'NIFTY INDIA MFG' },
]

const STOCK_FILTER_INDICES = { 'Nifty 200': nifty200, 'Nifty 500': nifty500 }
if (niftyFO.length > 0) STOCK_FILTER_INDICES['F&O'] = niftyFO

function IndexHeatmap() {
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [drawerIndex, setDrawerIndex] = useState(null)

  useEffect(() => {
    const load = async () => {
      const data = await fetchBulkQuotes(NSE_INDICES.map(i => i.symbol))
      setQuotes(data)
      setLoading(false)
    }
    load()
    const iv = setInterval(load, 60000)
    return () => clearInterval(iv)
  }, [])

  const sorted = useMemo(() => (
    [...NSE_INDICES].sort((a, b) => (quotes[b.symbol]?.changePct ?? -999) - (quotes[a.symbol]?.changePct ?? -999))
  ), [quotes])

  const advancing = sorted.filter(i => (quotes[i.symbol]?.changePct ?? 0) > 0).length
  const declining = sorted.filter(i => (quotes[i.symbol]?.changePct ?? 0) < 0).length
  const unchanged = sorted.filter(i => quotes[i.symbol]?.changePct === 0).length
  const best = sorted[0], worst = sorted[sorted.length - 1]

  return (
    <>
      {!loading && (
        <div className="px-3 py-2 border-b border-[var(--border)] text-xs text-[var(--text-secondary)] flex flex-wrap gap-x-4 gap-y-1 flex-shrink-0">
          <span>📈 Advancing: <span className="text-green-400 font-semibold">{advancing}</span></span>
          <span>📉 Declining: <span className="text-red-400 font-semibold">{declining}</span></span>
          <span>➡️ Unchanged: <span className="text-[var(--text-muted)] font-semibold">{unchanged}</span></span>
          {best && quotes[best.symbol]?.changePct != null && (
            <span className="hidden sm:inline">| Best: <span className="text-green-400 font-semibold">{best.name} +{quotes[best.symbol].changePct.toFixed(2)}%</span></span>
          )}
          {worst && quotes[worst.symbol]?.changePct != null && (
            <span className="hidden sm:inline">| Worst: <span className="text-red-400 font-semibold">{worst.name} {quotes[worst.symbol].changePct.toFixed(2)}%</span></span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="skeleton rounded-xl" style={{ minHeight: 110 }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {sorted.map(idx => (
              <IndexCard key={idx.symbol} index={idx} quote={quotes[idx.symbol]} onClick={setDrawerIndex} />
            ))}
          </div>
        )}
      </div>

      {drawerIndex && (
        <IndexDrawer index={drawerIndex} quote={quotes[drawerIndex.symbol]} onClose={() => setDrawerIndex(null)} />
      )}
    </>
  )
}

function StockHeatmap({ stockIndex }) {
  const symbols = STOCK_FILTER_INDICES[stockIndex]
  const { quotes, loading } = useStockData(symbols)

  // Flat grid — no sector grouping. Gainers first, no-data last.
  const stocks = useMemo(() => symbols
    .map(s => ({ ...s, quote: quotes[s.yahooSymbol] ?? null }))
    .sort((a, b) => (b.quote?.changePct ?? -9999) - (a.quote?.changePct ?? -9999)),
    [symbols, quotes])

  return (
    <div className="flex-1 overflow-auto p-3 md:p-4">
      {loading ? (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="skeleton rounded-md" style={{ width: 112, height: 62 }} />
          ))}
        </div>
      ) : (
        <>
          <div className="text-xs text-[var(--text-muted)] mb-2">{stocks.length} stocks · sorted by change</div>
          <div className="flex flex-wrap gap-1.5 content-start">
            {stocks.map(stock => <StockTile key={stock.symbol} stock={stock} />)}
          </div>
        </>
      )}
    </div>
  )
}

export function Heatmap() {
  const [mode, setMode] = useState('indices')
  const [stockIndex, setStockIndex] = useState('Nifty 500')

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex gap-1">
            {[['indices', '🏢 Sector Indices'], ['stocks', '📊 Stock Heatmap']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border
                  ${mode === id ? 'bg-[var(--accent)] text-black border-[var(--accent)]' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'stocks' && (
            <div className="flex gap-1 ml-2">
              {Object.keys(STOCK_FILTER_INDICES).map(idx => (
                <button
                  key={idx}
                  onClick={() => setStockIndex(idx)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors border
                    ${stockIndex === idx ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                  {idx}
                </button>
              ))}
            </div>
          )}
        </div>

        {mode === 'indices' ? <IndexHeatmap /> : <StockHeatmap stockIndex={stockIndex} />}
      </div>
    </ErrorBoundary>
  )
}
