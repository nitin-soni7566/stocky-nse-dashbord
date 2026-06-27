import { useState, useMemo } from 'react'
import { StockFilters } from './StockFilters.jsx'
import { StockTable } from './StockTable.jsx'
import { useStockData } from '../../hooks/useStockData.js'
import { ErrorBoundary } from '../UI/ErrorBoundary.jsx'
import { formatINR, formatChange } from '../../utils/formatters.js'
import nifty200 from '../../data/nifty200.json'
import nifty500 from '../../data/nifty500.json'

const INDICES = { 'Nifty 200': nifty200, 'Nifty 500': nifty500 }

export function StockList() {
  const [activeIndex, setActiveIndex] = useState('Nifty 200')
  const [filters, setFilters] = useState({ search: '', sort: 'change-desc', tab: 'All' })
  const [selectedStock, setSelectedStock] = useState(null)

  const symbols = INDICES[activeIndex]
  const { quotes, loading, lastUpdated, refresh, prevQuotes } = useStockData(symbols)

  const filteredStocks = useMemo(() => {
    let list = [...symbols]
    const q = filters.search.toLowerCase()
    if (q) list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))

    list = list.filter(s => {
      const change = quotes[s.yahooSymbol]?.changePct
      if (filters.tab === 'Gainers') return change > 0
      if (filters.tab === 'Losers') return change < 0
      if (filters.tab === 'Unchanged') return change === 0
      return true
    })

    const [field, dir] = filters.sort.split('-')
    list.sort((a, b) => {
      const qa = quotes[a.yahooSymbol]
      const qb = quotes[b.yahooSymbol]
      const va = field === 'price' ? (qa?.price ?? 0) : field === 'change' ? (qa?.changePct ?? 0) : (qa?.volume ?? 0)
      const vb = field === 'price' ? (qb?.price ?? 0) : field === 'change' ? (qb?.changePct ?? 0) : (qb?.volume ?? 0)
      return dir === 'asc' ? va - vb : vb - va
    })

    return list
  }, [symbols, quotes, filters])

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 pt-4 pb-0">
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
              {idx} <span className="text-xs opacity-60">({symbols.length})</span>
            </button>
          ))}
        </div>

        <StockFilters filters={filters} onChange={setFilters} onRefresh={refresh} lastUpdated={lastUpdated} />

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
