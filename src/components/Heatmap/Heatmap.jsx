import { useState, useEffect, useMemo } from 'react'
import { fetchBulkQuotes } from '../../utils/upstoxApi.js'
import { IndexCard } from './IndexCard.jsx'
import { IndexDrawer } from './IndexDrawer.jsx'
import { StockTile } from './StockTile.jsx'
import { useStockData } from '../../hooks/useStockData.js'
import { useGainersLosers } from '../../hooks/useGainersLosers.js'
import { usePDHBreakout } from '../../hooks/usePDHBreakout.js'
import { ErrorBoundary } from '../UI/ErrorBoundary.jsx'
import { useApp } from '../../context/AppContext.jsx'
import { PDH_BREAKOUT_COLOR } from '../../utils/heatColor.js'
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
  { symbol: '^CNXINDMFG', name: 'NIFTY INDIA MFG' },
]

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
  const declining = sorted.filter(i => (quotes[i.symbol]?.changePct ?? 0) <= 0).length
  const best = sorted[0], worst = sorted[sorted.length - 1]

  return (
    <>
      {!loading && (
        <div className="px-3 py-2 border-b border-[var(--border)] text-xs text-[var(--text-secondary)] flex flex-wrap gap-x-4 gap-y-1 flex-shrink-0">
          <span>📈 Advancing: <span className="text-green-400 font-semibold">{advancing}</span></span>
          <span>📉 Declining: <span className="text-red-400 font-semibold">{declining}</span></span>
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

function StockHeatmap({ mode, onSelectStock }) {
  const { gainers, losers, loading: rankLoading } = useGainersLosers()
  const { quotes: foQuotes, loading: foLoading } = useStockData(niftyFO)

  const loading = mode === 'F&O' ? foLoading : rankLoading

  // Flat grid — no sector grouping. Gainers/Losers already come pre-sorted in the
  // right direction from useGainersLosers (biggest gainer / biggest loser first) —
  // re-sorting descending here would flip Losers back to least-negative-first, so
  // only the (unsorted) F&O list needs sorting.
  const stocks = useMemo(() => {
    if (mode === 'Gainers') return gainers
    if (mode === 'Losers') return losers
    return [...niftyFO.map(s => ({ ...s, quote: foQuotes[s.yahooSymbol] ?? null }))]
      .sort((a, b) => (b.quote?.changePct ?? -9999) - (a.quote?.changePct ?? -9999))
  }, [mode, gainers, losers, foQuotes])

  // Scoped to whatever's currently on screen (not the full universe) — bounds
  // the network work while still applying the rule under every filter. Losers get
  // the symmetric breakdown condition (fresh low, not fresh high) — checking for
  // new highs on a list of declining stocks doesn't make sense.
  const pdhMode = mode === 'Losers' ? 'breakdown' : 'breakout'
  const pdhBreakouts = usePDHBreakout(stocks, pdhMode)
  const pdhLegendText = pdhMode === 'breakdown'
    ? 'Purple = Previous Day Low broken during 9:30 AM candle'
    : 'Purple = Previous Day High broken during 9:30 AM candle'

  return (
    <div className="flex-1 overflow-auto p-3">
      {loading ? (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="skeleton rounded-md" style={{ width: 112, height: 62 }} />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div className="text-xs text-[var(--text-muted)]">{stocks.length} stocks · sorted by change</div>
            <div
              className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]"
              title={pdhLegendText}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PDH_BREAKOUT_COLOR }} />
              {pdhLegendText}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 content-start">
            {stocks.map(stock => (
              <StockTile
                key={stock.symbol}
                stock={stock}
                onClick={s => onSelectStock(s.symbol)}
                pdhBroken={pdhBreakouts.has(stock.yahooSymbol)}
                pdhLabel={pdhMode === 'breakdown' ? 'PDL broken (9:30 candle)' : 'PDH broken (9:30 candle)'}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function Heatmap() {
  const [mode, setMode] = useState('indices')
  const [stockMode, setStockMode] = useState('Gainers')
  const { dispatch } = useApp()
  const openDetail = symbol => dispatch({ type: 'OPEN_STOCK_DETAIL', payload: symbol })

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
              {['Gainers', 'Losers', 'F&O'].map(idx => (
                <button
                  key={idx}
                  onClick={() => setStockMode(idx)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors border
                    ${stockMode === idx ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                  {idx === 'Gainers' ? '📈 Gainers' : idx === 'Losers' ? '📉 Losers' : '⚙️ F&O'}
                </button>
              ))}
            </div>
          )}
        </div>

        {mode === 'indices' ? <IndexHeatmap /> : <StockHeatmap mode={stockMode} onSelectStock={openDetail} />}
      </div>
    </ErrorBoundary>
  )
}
