import { useMemo } from 'react'
import { DashboardCard, ViewAllButton } from './DashboardCard.jsx'
import { StockCard } from '../UI/StockCard.jsx'
import { useWatchlist } from '../../hooks/useWatchlist.js'
import { useApp } from '../../context/AppContext.jsx'
import { findStock } from '../../utils/instruments.js'

export function WatchlistWidget({ quotes }) {
  const { symbols, isFavorite, toggle } = useWatchlist()
  const { dispatch } = useApp()

  const stocks = useMemo(() => symbols.map(findStock).filter(Boolean), [symbols])

  return (
    <DashboardCard
      title="Watchlist"
      icon="⭐"
      className="sm:col-span-2 lg:col-span-3"
      action={stocks.length > 0 && <ViewAllButton onClick={() => dispatch({ type: 'SET_VIEW', payload: 'stocklist' })} />}
    >
      {stocks.length === 0 ? (
        <div className="text-center py-6 text-xs text-[var(--text-muted)]">
          No stocks saved yet — tap ☆ on any stock card to add it here.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {stocks.map(stock => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              quote={quotes[stock.yahooSymbol] ?? null}
              isFavorite={isFavorite(stock.symbol)}
              onToggleFavorite={toggle}
              onClick={s => dispatch({ type: 'OPEN_STOCK_DETAIL', payload: s.symbol })}
            />
          ))}
        </div>
      )}
    </DashboardCard>
  )
}
