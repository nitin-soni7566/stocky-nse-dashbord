import { useMemo, useState } from 'react'
import { DashboardCard, ViewAllButton } from './DashboardCard.jsx'
import { SectorBlock } from '../Heatmap/SectorBlock.jsx'
import { SectorModal } from '../Heatmap/SectorModal.jsx'
import { useHeatmap } from '../../hooks/useHeatmap.js'
import { useApp } from '../../context/AppContext.jsx'

export function HeatmapPreview({ gainers, losers, quotes }) {
  const { dispatch } = useApp()
  const [expandedSector, setExpandedSector] = useState(null)
  const combined = useMemo(() => [...gainers, ...losers], [gainers, losers])
  const sectors = useHeatmap(combined, quotes)
  const top = sectors.slice(0, 6)

  return (
    <DashboardCard
      title="Sector Heatmap"
      icon="🌡️"
      className="sm:col-span-2 lg:col-span-3"
      action={<ViewAllButton onClick={() => dispatch({ type: 'SET_VIEW', payload: 'heatmap' })} label="Full heatmap" />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {top.map(s => (
          <SectorBlock
            key={s.sector}
            sector={s.sector}
            stocks={s.stocks.slice(0, 12)}
            avgChange={s.avgChange}
            count={s.count}
            onExpand={setExpandedSector}
            onTileClick={stock => dispatch({ type: 'OPEN_STOCK_DETAIL', payload: stock.symbol })}
          />
        ))}
      </div>

      {expandedSector && (
        <SectorModal
          sector={expandedSector.sector}
          stocks={expandedSector.stocks}
          onClose={() => setExpandedSector(null)}
          onSelect={symbol => dispatch({ type: 'OPEN_STOCK_DETAIL', payload: symbol })}
        />
      )}
    </DashboardCard>
  )
}
