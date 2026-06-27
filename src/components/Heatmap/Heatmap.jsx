import { useState } from 'react'
import { SectorBlock } from './SectorBlock.jsx'
import { SectorModal } from './SectorModal.jsx'
import { useHeatmap } from '../../hooks/useHeatmap.js'
import { useStockData } from '../../hooks/useStockData.js'
import { ErrorBoundary } from '../UI/ErrorBoundary.jsx'
import { SkeletonCard } from '../UI/Skeleton.jsx'
import nifty500 from '../../data/nifty500.json'

export function Heatmap() {
  const { quotes, loading } = useStockData(nifty500)
  const sectors = useHeatmap(nifty500, quotes)
  const [modalData, setModalData] = useState(null)

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-[var(--border)] flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Sector Heatmap</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Nifty 500 — Click a sector to expand</p>
          </div>
          {!loading && (
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#7F0000' }} /> &lt;-3%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#C0392B' }} /> -3 to -1%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#1E8449' }} /> 0 to +1%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#27AE60' }} /> +1 to +3%</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#0B5E2A' }} /> &gt;+3%</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-3 md:p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {sectors.map(({ sector, stocks, avgChange, count }) => (
                <SectorBlock
                  key={sector}
                  sector={sector}
                  stocks={stocks}
                  avgChange={avgChange}
                  count={count}
                  onClick={setModalData}
                />
              ))}
            </div>
          )}
        </div>

        {modalData && (
          <SectorModal
            sector={modalData.sector}
            stocks={modalData.stocks}
            onClose={() => setModalData(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
