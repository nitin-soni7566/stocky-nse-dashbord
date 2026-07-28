import { useState, useMemo, useCallback } from 'react'
import { StockFilters } from './StockFilters.jsx'
import { StockTable } from './StockTable.jsx'
import { IndexTicker } from './IndexTicker.jsx'
import { useStockData } from '../../hooks/useStockData.js'
import { useGainersLosers } from '../../hooks/useGainersLosers.js'
import { useWatchlist } from '../../hooks/useWatchlist.js'
import { useApp } from '../../context/AppContext.jsx'
import { ErrorBoundary } from '../UI/ErrorBoundary.jsx'
import { StockCard } from '../UI/StockCard.jsx'
import { VirtualCardList } from '../UI/VirtualCardList.jsx'
import niftyFO from '../../data/niftyFO.json'

const TABS = ['Gainers', 'Losers', 'F&O']

export function StockList() {
  const [activeTab, setActiveTab] = useState('Gainers')
  const [filters, setFilters] = useState({ search: '', sort: 'change-desc', tab: 'All' })
  const { dispatch } = useApp()
  const openDetail = useCallback(stock => dispatch({ type: 'OPEN_STOCK_DETAIL', payload: stock.symbol }), [dispatch])

  const { gainers, losers, quotes: rankQuotes, loading: rankLoading, lastUpdated: rankUpdated, refresh: rankRefresh, dataSource: rankSource } = useGainersLosers()
  const { quotes: foQuotes, loading: foLoading, lastUpdated: foUpdated, refresh: foRefresh, prevQuotes: foPrev, dataSource: foSource } = useStockData(niftyFO)
  const { isFavorite, toggle: toggleFavorite } = useWatchlist()

  const isRanked = activeTab !== 'F&O'
  const symbols = activeTab === 'Gainers' ? gainers : activeTab === 'Losers' ? losers : niftyFO
  const quotes = isRanked ? rankQuotes : foQuotes
  const loading = isRanked ? rankLoading : foLoading
  const lastUpdated = isRanked ? rankUpdated : foUpdated
  const refresh = isRanked ? rankRefresh : foRefresh
  const dataSource = isRanked ? rankSource : foSource
  const prevQuotes = isRanked ? {} : foPrev

  const filteredStocks = useMemo(() => {
    let list = [...symbols]

    const q = filters.search.toLowerCase()
    if (q) list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))

    if (filters.tab !== 'All') {
      list = list.filter(s => {
        const change = quotes[s.yahooSymbol]?.changePct
        if (change == null) return false
        if (filters.tab === 'Gainers')   return change > 0
        if (filters.tab === 'Losers')    return change < 0
        if (filters.tab === 'Unchanged') return Math.abs(change) < 0.05
        return true
      })
    }

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
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-t text-sm font-medium border-b-2 transition-colors
                ${activeTab === t
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              {t === 'Gainers' ? '📈 Top Gainers' : t === 'Losers' ? '📉 Top Losers' : '⚙️ F&O'}
            </button>
          ))}
        </div>

        <StockFilters filters={filters} onChange={setFilters} onRefresh={refresh} lastUpdated={lastUpdated} dataSource={dataSource} />

        <div className="flex flex-1 overflow-hidden relative">
          {/* Desktop: dense table */}
          <div className="hidden md:flex flex-1 overflow-hidden">
            <StockTable
              stocks={filteredStocks}
              quotes={quotes}
              prevQuotes={prevQuotes}
              loading={loading}
              onRowClick={openDetail}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          </div>

          {/* Mobile: swipe-friendly virtualized card list */}
          <div className="flex md:hidden flex-1 flex-col overflow-hidden px-3 py-2">
            {loading && filteredStocks.length === 0 ? (
              <div className="space-y-2.5">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton rounded-xl" style={{ height: 118 }} />)}
              </div>
            ) : (
              <VirtualCardList
                items={filteredStocks}
                itemHeight={118}
                renderItem={stock => (
                  <StockCard
                    stock={stock}
                    quote={quotes[stock.yahooSymbol] ?? null}
                    isFavorite={isFavorite(stock.symbol)}
                    onToggleFavorite={toggleFavorite}
                    onClick={openDetail}
                  />
                )}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
