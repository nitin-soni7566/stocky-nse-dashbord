import { useMemo } from 'react'
import { DashboardCard } from './DashboardCard.jsx'
import { CompactStockList } from './CompactStockList.jsx'
import { getMostActive } from '../../utils/rankings.js'
import { ALL_STOCKS } from '../../utils/instruments.js'

// "Trending" = high-volume stocks that are also moving up — most-active ranking
// (utils/rankings.js) narrowed to positive change%.
export function TrendingStocks({ quotes }) {
  const rows = useMemo(() => (
    getMostActive(ALL_STOCKS, quotes, 40).filter(s => (s.quote?.changePct ?? 0) > 0).slice(0, 6)
  ), [quotes])

  return (
    <DashboardCard title="Trending Stocks" icon="🔥">
      <CompactStockList rows={rows} />
    </DashboardCard>
  )
}
