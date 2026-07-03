import { useState, useMemo } from 'react'
import { StockFilters } from './StockFilters.jsx'
import { StockTable } from './StockTable.jsx'
import { IndexTicker } from './IndexTicker.jsx'
import { useStockData } from '../../hooks/useStockData.js'
import { ErrorBoundary } from '../UI/ErrorBoundary.jsx'
import { formatINR, formatChange } from '../../utils/formatters.js'
import nifty200 from '../../data/nifty200.json'
import nifty500 from '../../data/nifty500.json'
import nifty750 from '../../data/nifty750.json'
import niftyFO from '../../data/niftyFO.json'

// Nifty Total = the NSE Nifty Total Market universe (~750 stocks).
const INDICES = { 'Nifty Total': nifty750, 'Nifty 500': nifty500, 'Nifty 200': nifty200 }
if (niftyFO.length > 0) INDICES['F&O'] = niftyFO

export function StockList() {
  const [activeIndex, setActiveIndex] = useState('Nifty 200')
  const [filters, setFilters] = useState({ search: '', sort: 'change-desc', tab: 'All' }) // change-desc = Gainers First
  const [selectedStock, setSelectedStock] = useState(null)

  const symbols = INDICES[activeIndex]
  const { quotes, loading, lastUpdated, refresh, prevQuotes, dataSource } = useStockData(symbols)

  const filteredStocks = useMemo(() => {
    let list = [...symbols]

    // Search filter
    const q = filters.search.toLowerCase()
    if (q) list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))

    // Tab filter — only exclude stocks we have data for; stocks with no data pass through
    if (filters.tab !== 'All') {
      list = list.filter(s => {
        const change = quotes[s.yahooSymbol]?.changePct
        if (change == null) return false   // hide no-data stocks in filtered tabs
        if (filters.tab === 'Gainers')   return change > 0
        if (filters.tab === 'Losers')    return change < 0
        if (filters.tab === 'Unchanged') return Math.abs(change) < 0.05
        return true
      })
    }

    // Sort — push stocks with no data to bottom regardless of direction
    const [field, dir] = filters.sort.split('-')
    list.sort((a, b) => {
      const qa = quotes[a.yahooSymbol]
      const qb = quotes[b.yahooSymbol]
      const va = field === 'price' ? qa?.price : field === 'change' ? qa?.changePct : qa?.volume
      const vb = field === 'price' ? qb?.price : field === 'change' ? qb?.changePct : qb?.volume
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return dir === 'asc' ? va - vb : vb - va
    })

    return list
  }, [symbols, quotes, filters])

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full">
        <IndexTicker />
        <div className="flex items-center gap-2 px-4 pt-3 pb-0">
          {Object.keys(INDICES).map(idx => (
            <button
              key={idx}
              onClick={() => { setActiveIndex(idx); setSelectedStock(null) }}
              className={`px-4 py-2 rounded-t text-sm font-medium border-b-2 transition-colors
                ${activeIndex === idx
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              {idx} <span className="text-xs opacity-60">({INDICES[idx].length})</span>
            </button>
          ))}
        </div>

        <StockFilters filters={filters} onChange={setFilters} onRefresh={refresh} lastUpdated={lastUpdated} dataSource={dataSource} />

        <div className="flex flex-1 overflow-hidden relative">
          <StockTable
            stocks={filteredStocks}
            quotes={quotes}
            prevQuotes={prevQuotes}
            loading={loading}
            onRowClick={setSelectedStock}
          />

          {selectedStock && (
            <StockDetailPanel
              stock={selectedStock}
              quote={quotes[selectedStock.yahooSymbol]}
              onClose={() => setSelectedStock(null)}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}

function StockDetailPanel({ stock, quote, onClose }) {
  return (
    <div className="absolute md:relative inset-0 md:inset-auto md:w-72 border-l border-[var(--border)] bg-[var(--bg-secondary)] flex flex-col flex-shrink-0 overflow-y-auto z-10 md:z-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <span className="font-semibold text-[var(--accent)] font-mono">{stock.symbol}</span>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg">×</button>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-xs text-[var(--text-secondary)]">{stock.name}</p>
        <p className="text-xs text-[var(--text-muted)]">{stock.sector}</p>
        {quote ? (
          <>
            <div className="pt-2">
              <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">{formatINR(quote.price)}</p>
              <p className={`text-sm font-mono ${quote.changePct >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                {formatChange(quote.change)} ({formatChange(quote.changePct, true)})
              </p>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ['Open', quote.open], ['Prev Close', quote.prevClose],
                ['Day High', quote.high], ['Day Low', quote.low]
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className="font-mono text-[var(--text-secondary)]">{val != null ? formatINR(val) : '—'}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">ISIN</span>
                <span className="font-mono text-[var(--text-secondary)] text-xs">{stock.isin}</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        )}
      </div>
    </div>
  )
}
