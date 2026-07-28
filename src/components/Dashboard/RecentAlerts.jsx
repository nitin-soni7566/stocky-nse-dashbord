import { DashboardCard } from './DashboardCard.jsx'
import { useAlerts } from '../../hooks/useAlerts.js'
import { useApp } from '../../context/AppContext.jsx'

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export function RecentAlerts({ stocks, quotes }) {
  const { alerts } = useAlerts(stocks, quotes)
  const { dispatch } = useApp()

  return (
    <DashboardCard title="Recent Alerts" icon="🔔">
      {alerts.length === 0 ? (
        <div className="text-center py-6 text-xs text-[var(--text-muted)]">
          No alerts yet — big movers (±5% or more) will show up here.
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border)] max-h-72 overflow-y-auto">
          {alerts.map(a => (
            <button
              key={a.id}
              onClick={() => dispatch({ type: 'OPEN_STOCK_DETAIL', payload: a.symbol })}
              className="flex items-center justify-between gap-2 py-2 text-left hover:bg-[var(--bg-hover)] transition-colors -mx-1 px-1 rounded"
            >
              <div className="min-w-0">
                <div className="text-xs text-[var(--text-primary)]">
                  <span className="font-mono font-semibold text-[var(--accent)]">{a.symbol}</span>{' '}
                  crossed {a.direction === 'up' ? '+' : '-'}{a.threshold}%
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">{timeAgo(a.at)}</div>
              </div>
              <span className="font-mono text-xs font-semibold flex-shrink-0" style={{ color: a.direction === 'up' ? 'var(--green)' : 'var(--red)' }}>
                {a.changePct >= 0 ? '+' : ''}{a.changePct.toFixed(2)}%
              </span>
            </button>
          ))}
        </div>
      )}
    </DashboardCard>
  )
}
