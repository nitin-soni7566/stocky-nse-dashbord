import { useMemo } from 'react'
import { DashboardCard } from './DashboardCard.jsx'
import { CompactStockList } from './CompactStockList.jsx'
import { getMostActive } from '../../utils/rankings.js'
import { ALL_STOCKS } from '../../utils/instruments.js'

export function MostActiveStocks({ quotes }) {
  const rows = useMemo(() => getMostActive(ALL_STOCKS, quotes, 6), [quotes])

  return (
    <DashboardCard title="Most Active" icon="⚡">
      <CompactStockList rows={rows} />
    </DashboardCard>
  )
}
