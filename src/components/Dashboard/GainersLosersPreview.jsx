import { DashboardCard, ViewAllButton } from './DashboardCard.jsx'
import { StockCard } from '../UI/StockCard.jsx'
import { useWatchlist } from '../../hooks/useWatchlist.js'
import { useApp } from '../../context/AppContext.jsx'

function Row({ stocks }) {
  const { isFavorite, toggle } = useWatchlist()
  const { dispatch } = useApp()

  if (!stocks.length) return <div className="text-xs text-[var(--text-muted)] py-4 text-center">No data</div>

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
      {stocks.map(s => (
        <div key={s.symbol} className="flex-shrink-0 w-40 snap-start">
          <StockCard
            stock={s}
            quote={s.quote}
            isFavorite={isFavorite(s.symbol)}
            onToggleFavorite={toggle}
            onClick={stock => dispatch({ type: 'OPEN_STOCK_DETAIL', payload: stock.symbol })}
          />
        </div>
      ))}
    </div>
  )
}

// This one horizontal-scroll row is a deliberate exception to the app's
// "no horizontal scrolling" rule — it's a swipeable carousel (content wider
// than the viewport by design), not a table overflowing its container.
export function GainersLosersPreview({ gainers, losers }) {
  const { dispatch } = useApp()

  return (
    <>
      <DashboardCard
        title="Top Gainers"
        icon="📈"
        action={<ViewAllButton onClick={() => dispatch({ type: 'SET_VIEW', payload: 'stocklist' })} />}
      >
        <Row stocks={gainers.slice(0, 8)} />
      </DashboardCard>

      <DashboardCard
        title="Top Losers"
        icon="📉"
        action={<ViewAllButton onClick={() => dispatch({ type: 'SET_VIEW', payload: 'stocklist' })} />}
      >
        <Row stocks={losers.slice(0, 8)} />
      </DashboardCard>
    </>
  )
}
