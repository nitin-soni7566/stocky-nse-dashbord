import { Skeleton } from '../UI/Skeleton.jsx'
import { VISIBLE_INDICES, Arrow, changeColor, fmtNum, fmtSigned, cardGradient, vixZone } from './common.jsx'

function IndexCard({ name, label, data, onRetry }) {
  if (data?.loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 flex flex-col gap-2" style={{ minHeight: 110, background: 'var(--bg-card)' }}>
        <Skeleton width="60%" height="10px" />
        <Skeleton width="80%" height="22px" />
        <Skeleton width="70%" height="12px" />
      </div>
    )
  }

  if (data?.error || data?.price == null) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 flex flex-col items-start justify-center gap-2" style={{ minHeight: 110, background: 'var(--bg-card)' }}>
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        <span className="text-sm text-[var(--text-secondary)]">Unable to load {label}</span>
        <button onClick={onRetry} className="text-xs text-[var(--accent)] hover:underline">Retry</button>
      </div>
    )
  }

  const isVix = name === 'indiaVix'
  const zone = isVix ? vixZone(data.price) : null
  const background = isVix ? zone.gradient : cardGradient(data.changePct)
  const color = changeColor(name, data.changePct)
  const up = (data.changePct ?? 0) >= 0

  return (
    <div className="rounded-xl border border-[var(--border)] p-4 flex flex-col gap-1.5" style={{ minHeight: 110, background }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        {isVix && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ color: zone.color, background: 'rgba(0,0,0,0.25)' }}>{zone.label}</span>}
      </div>
      <span className="text-[20px] font-mono leading-tight" style={{ color: '#f0f0f0' }}>{fmtNum(data.price)}</span>
      <span className="text-[12px] font-medium flex items-center gap-1" style={{ color }}>
        <Arrow up={up} />
        {fmtSigned(data.change)} ({fmtSigned(data.changePct)}%)
      </span>
      <span className="text-[10px] text-[var(--text-muted)] mt-0.5">
        H {fmtNum(data.high)} · L {fmtNum(data.low)}
      </span>
    </div>
  )
}

export function IndexCards({ indices, onRetry }) {
  const items = VISIBLE_INDICES.filter(i => !(i.name === 'giftNifty' && indices.giftNifty?.price == null))
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(({ name, label }) => (
        <IndexCard key={name} name={name} label={label} data={indices[name]} onRetry={onRetry} />
      ))}
    </div>
  )
}
