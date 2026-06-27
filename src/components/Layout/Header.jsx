import { useState, useEffect } from 'react'
import { MarketStatus } from './MarketStatus.jsx'
import { formatTime } from '../../utils/formatters.js'
import { useApp } from '../../context/AppContext.jsx'

export function Header() {
  const [time, setTime] = useState(formatTime(new Date()))
  const { addToast } = useApp()

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime(new Date())), 1000)
    return () => clearInterval(t)
  }, [])

  const refreshSymbols = async () => {
    addToast('Refreshing symbols from NSE...', 'info')
    try {
      const res = await fetch('/api/refresh-symbols', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        addToast(`✅ Symbols refreshed: ${data.nifty200} + ${data.nifty500} stocks loaded`, 'success')
      } else {
        addToast('❌ Failed to refresh symbols', 'error')
      }
    } catch {
      addToast('❌ Server not reachable', 'error')
    }
  }

  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center px-4 md:px-6 gap-3 flex-shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="text-base md:text-lg font-bold text-[var(--accent)]">Stocky</span>
        <span className="text-base md:text-lg font-bold text-[var(--text-primary)] hidden sm:inline">NSE Dashboard</span>
        <span className="text-base md:text-lg font-bold text-[var(--text-primary)] sm:hidden">NSE</span>
      </div>

      <div className="flex-1" />

      <MarketStatus />

      <span className="font-mono text-xs text-[var(--text-secondary)] hidden sm:inline">{time} IST</span>

      {!import.meta.env.PROD && (
        <button
          onClick={refreshSymbols}
          className="hidden md:inline-flex px-3 py-1.5 text-xs rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
        >
          ↻ Refresh Symbols
        </button>
      )}
    </header>
  )
}
