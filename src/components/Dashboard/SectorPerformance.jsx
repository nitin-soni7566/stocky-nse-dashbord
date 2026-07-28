import { useMemo } from 'react'
import { DashboardCard } from './DashboardCard.jsx'
import { useHeatmap } from '../../hooks/useHeatmap.js'
import { formatChange } from '../../utils/formatters.js'

export function SectorPerformance({ gainers, losers, quotes }) {
  const combined = useMemo(() => [...gainers, ...losers], [gainers, losers])
  const sectors = useHeatmap(combined, quotes)
  const top = useMemo(() => (
    [...sectors].filter(s => s.avgChange != null).sort((a, b) => Math.abs(b.avgChange) - Math.abs(a.avgChange)).slice(0, 8)
  ), [sectors])

  const maxAbs = Math.max(1, ...top.map(s => Math.abs(s.avgChange)))

  return (
    <DashboardCard title="Sector Performance" icon="🏭">
      <div className="flex flex-col gap-2">
        {top.map(s => {
          const pct = s.avgChange
          const width = Math.min(100, (Math.abs(pct) / maxAbs) * 100)
          const positive = pct >= 0
          return (
            <div key={s.sector} className="flex items-center gap-2 text-xs">
              <span className="w-28 truncate text-[var(--text-secondary)]">{s.sector}</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${width}%`, background: positive ? 'var(--green)' : 'var(--red)' }}
                />
              </div>
              <span className="w-14 text-right font-mono" style={{ color: positive ? 'var(--green)' : 'var(--red)' }}>
                {formatChange(pct, true)}
              </span>
            </div>
          )
        })}
      </div>
    </DashboardCard>
  )
}
