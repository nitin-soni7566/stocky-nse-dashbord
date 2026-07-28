import { useMemo } from 'react'
import { DashboardCard } from './DashboardCard.jsx'
import { ALL_STOCKS } from '../../utils/instruments.js'

export function MarketBreadth({ quotes }) {
  const { advances, declines, unchanged, total } = useMemo(() => {
    let advances = 0, declines = 0, unchanged = 0
    for (const s of ALL_STOCKS) {
      const pct = quotes[s.yahooSymbol]?.changePct
      if (pct == null) continue
      if (pct > 0.02) advances++
      else if (pct < -0.02) declines++
      else unchanged++
    }
    return { advances, declines, unchanged, total: advances + declines + unchanged }
  }, [quotes])

  const advPct = total ? (advances / total) * 100 : 50

  return (
    <DashboardCard title="Market Breadth" icon="⚖️">
      <div className="h-2.5 rounded-full bg-[var(--red)] overflow-hidden flex">
        <div className="h-full" style={{ width: `${advPct}%`, background: 'var(--green)' }} />
      </div>
      <div className="flex items-center justify-between text-xs mt-1">
        <span style={{ color: 'var(--green)' }}>▲ {advances} Advances</span>
        <span className="text-[var(--text-muted)]">{unchanged} Flat</span>
        <span style={{ color: 'var(--red)' }}>▼ {declines} Declines</span>
      </div>
    </DashboardCard>
  )
}
