import { Skeleton } from '../UI/Skeleton.jsx'
import { GREEN, RED, GREY } from './common.jsx'

const ROWS = [
  { key: 'nifty50', label: 'Nifty 50' },
  { key: 'nifty500', label: 'Nifty 500' },
  { key: 'niftyBank', label: 'Nifty Bank' }
]

function ADRow({ label, row, last }) {
  const advancers = row?.advancers ?? 0
  const decliners = row?.decliners ?? 0
  const total = advancers + decliners
  const advWidth = total > 0 ? (advancers / total) * 100 : 50
  const decWidth = total > 0 ? (decliners / total) * 100 : 50
  const pct = row?.changePct ?? 0
  const pctColor = pct > 0 ? GREEN : pct < 0 ? RED : GREY

  return (
    <div className="py-3" style={{ borderBottom: last ? 'none' : '1px dashed rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[var(--text-secondary)] w-20 shrink-0">{label}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium" style={{ color: GREEN }}>▲ {advancers}</span>
            <span className="text-[11px] font-medium" style={{ color: RED }}>▼ {decliners}</span>
          </div>
          <div style={{ position: 'relative', height: 6, background: '#1e1e1e', borderRadius: 3 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: 6, width: `${advWidth}%`, background: '#1a6b35', borderRadius: '3px 0 0 3px' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, height: 6, width: `${decWidth}%`, background: '#7a1a1a', borderRadius: '0 3px 3px 0' }} />
            <div style={{ position: 'absolute', left: `${advWidth}%`, top: -3, width: 3, height: 12, background: '#3b82f6', borderRadius: 2, transform: 'translateX(-50%)', zIndex: 2 }} />
          </div>
        </div>
        <span className="text-[12px] font-bold w-16 text-right shrink-0" style={{ color: pctColor }}>
          {pct > 0 ? '▲' : pct < 0 ? '▼' : '—'} {Math.abs(pct).toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

export function AdvanceDecline({ adData, stocksLoaded }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Advance / Decline</h3>
      {!stocksLoaded ? (
        <div className="py-4 space-y-4">
          {ROWS.map(r => (
            <div key={r.key} className="flex items-center gap-3">
              <span className="text-[12px] text-[var(--text-muted)] w-20 shrink-0">{r.label}</span>
              <Skeleton height="6px" />
            </div>
          ))}
          <p className="text-[11px] text-[var(--text-muted)]">Loading stock data…</p>
        </div>
      ) : (
        ROWS.map((r, i) => <ADRow key={r.key} label={r.label} row={adData[r.key]} last={i === ROWS.length - 1} />)
      )}
    </div>
  )
}
