import { useRef, useEffect, useState } from 'react'
import { Skeleton } from '../UI/Skeleton.jsx'
import { isMarketOpen } from '../../utils/marketHours.js'
import { VISIBLE_INDICES, Arrow, changeColor, fmtNum, fmtSigned, GREY } from './common.jsx'

const STALE_MS = 2 * 60 * 1000

function TickerItem({ name, label, data, onRetry, marketOpen }) {
  const prevPrice = useRef(null)
  const [flash, setFlash] = useState('')

  useEffect(() => {
    if (data?.price == null) return
    if (prevPrice.current != null && data.price !== prevPrice.current) {
      setFlash(data.price > prevPrice.current ? 'flash-green' : 'flash-red')
      const t = setTimeout(() => setFlash(''), 500)
      prevPrice.current = data.price
      return () => clearTimeout(t)
    }
    prevPrice.current = data.price
  }, [data?.price])

  if (data?.loading) {
    return (
      <span className="flex items-center gap-2 px-4 shrink-0">
        <span className="text-[11px] font-medium text-[var(--text-muted)]">{label}</span>
        <Skeleton width="80px" height="12px" />
      </span>
    )
  }

  if (data?.error) {
    return (
      <span className="flex items-center gap-2 px-4 shrink-0">
        <span className="text-[11px] font-medium text-[var(--text-muted)]">{label}</span>
        <span className="text-[11px] font-bold" style={{ color: '#E53935' }}>ERR</span>
        <button onClick={onRetry} title="Retry" className="text-[var(--text-muted)] hover:text-[var(--accent)]" aria-label="Retry">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
        </button>
      </span>
    )
  }

  const up = (data.changePct ?? 0) >= 0
  const color = changeColor(name, data.changePct)
  // Only treat data as "stale/delayed" while the market is open — when it's closed,
  // the last traded price IS the correct value and should show at full opacity.
  const stale = marketOpen && data.lastUpdated && Date.now() - data.lastUpdated > STALE_MS

  return (
    <span className={`flex items-center gap-2 px-4 shrink-0 rounded ${flash}`} style={{ opacity: stale ? 0.6 : 1 }}>
      <span className="text-[11px] font-medium text-[var(--text-muted)]">{label}</span>
      <span className="text-[13px] font-mono text-[var(--text-primary)]">{fmtNum(data.price)}</span>
      <span className="text-[12px] font-medium flex items-center gap-1" style={{ color }}>
        {fmtSigned(data.change)} ({fmtSigned(data.changePct)}%)
        <Arrow up={up} />
      </span>
    </span>
  )
}

export function TickerStrip({ indices, onRetry }) {
  const marketOpen = isMarketOpen()
  const items = VISIBLE_INDICES.filter(i => !(i.name === 'giftNifty' && indices.giftNifty?.price == null))
  const anyStale = marketOpen && items.some(i => indices[i.name]?.lastUpdated && Date.now() - indices[i.name].lastUpdated > STALE_MS)

  return (
    <div className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-x-auto">
      <div className="flex items-center py-3 divide-x divide-[var(--border)] min-w-max">
        {items.map(({ name, label }) => (
          <TickerItem key={name} name={name} label={label} data={indices[name]} onRetry={onRetry} marketOpen={marketOpen} />
        ))}
        {anyStale && <span className="px-4 text-[11px] shrink-0" style={{ color: GREY }}>(delayed)</span>}
        {!marketOpen && <span className="px-4 text-[11px] shrink-0" style={{ color: GREY }}>· market closed (last price)</span>}
      </div>
    </div>
  )
}
