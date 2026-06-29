import { useState, useEffect } from 'react'
import { useMarketStatus } from '../../hooks/useMarketStatus.js'
import { formatTime } from '../../utils/formatters.js'

function useCountdown(targetISO) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!targetISO) return
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(targetISO) - Date.now()) / 1000))
      setSecs(diff)
    }
    calc()
    const iv = setInterval(calc, 1000)
    return () => clearInterval(iv)
  }, [targetISO])
  const m = Math.floor(secs / 60), s = secs % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export function MarketBanner() {
  const { session, nextOpen, nextClose } = useMarketStatus()
  const [time, setTime] = useState(formatTime(new Date()))
  const countdown = useCountdown(session === 'pre-open' ? nextClose : null)

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime(new Date())), 1000)
    return () => clearInterval(t)
  }, [])

  const configs = {
    open: {
      bg: 'rgba(0,100,40,0.25)',
      border: 'rgba(0,200,83,0.3)',
      text: '🟢 MARKET OPEN — Live prices updating every 60s',
      extra: nextClose ? `Next close: ${new Date(nextClose).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST` : null
    },
    'pre-open': {
      bg: 'rgba(100,80,0,0.25)',
      border: 'rgba(200,170,0,0.3)',
      text: '🟡 PRE-OPEN SESSION 9:00–9:15 AM',
      extra: `Market opens in: ${countdown}`
    },
    closed: {
      bg: 'rgba(80,0,0,0.2)',
      border: 'rgba(180,0,0,0.25)',
      text: '🔴 MARKET CLOSED — Showing previous close data',
      extra: nextOpen ? `Next open: ${new Date(nextOpen).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit' })} IST` : null
    }
  }

  const cfg = configs[session] ?? configs.closed

  return (
    <div style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}
      className="flex items-center justify-between px-4 py-1.5 text-xs flex-shrink-0 flex-wrap gap-1">
      <span className="font-medium text-[var(--text-primary)]">{cfg.text}</span>
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        {cfg.extra && <span>{cfg.extra}</span>}
        <span className="font-mono text-[var(--text-muted)]">IST: {time}</span>
      </div>
    </div>
  )
}
