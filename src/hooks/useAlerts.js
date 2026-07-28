import { useState, useEffect, useRef } from 'react'

const KEY = 'app_alerts'
const MAX_ALERTS = 30
const THRESHOLDS = [5, 10, 15]

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

// Reads the same 'app_settings' key SettingsPanel.jsx writes to, so its
// "Browser notifications" toggle actually does something.
function notificationsEnabled() {
  try {
    return JSON.parse(localStorage.getItem('app_settings') ?? '{}').notifications === true
  } catch {
    return false
  }
}

function notify(alert) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const arrow = alert.direction === 'up' ? '▲' : '▼'
  new Notification(`${arrow} ${alert.symbol} crossed ${alert.direction === 'up' ? '+' : '-'}${alert.threshold}%`, {
    body: `${alert.name} · ${alert.changePct >= 0 ? '+' : ''}${alert.changePct.toFixed(2)}%`,
    tag: alert.id
  })
}

// Watches a live quotes map for symbols crossing |changePct| thresholds and
// appends a de-duplicated (once per symbol per threshold per session),
// timestamped, capped, localStorage-persisted alert feed — mirrors
// useWatchlist.js's persistence pattern.
export function useAlerts(stocks, quotes) {
  const [alerts, setAlerts] = useState(load)
  const seenRef = useRef(new Set())

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(alerts.slice(0, MAX_ALERTS)))
  }, [alerts])

  useEffect(() => {
    if (!stocks?.length || !quotes) return
    const fresh = []
    for (const stock of stocks) {
      const pct = quotes[stock.yahooSymbol]?.changePct
      if (pct == null) continue
      for (const t of THRESHOLDS) {
        if (Math.abs(pct) < t) continue
        const seenKey = `${stock.symbol}:${t}`
        if (seenRef.current.has(seenKey)) continue
        seenRef.current.add(seenKey)
        fresh.push({
          id: `${Date.now()}-${stock.symbol}-${t}`,
          symbol: stock.symbol,
          name: stock.name,
          changePct: pct,
          threshold: t,
          direction: pct >= 0 ? 'up' : 'down',
          at: Date.now()
        })
      }
    }
    if (fresh.length) {
      if (notificationsEnabled()) fresh.forEach(notify)
      setAlerts(prev => [...fresh.reverse(), ...prev].slice(0, MAX_ALERTS))
    }
  }, [stocks, quotes])

  return { alerts }
}
