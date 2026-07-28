import { useState, useEffect } from 'react'
import { MarketStatus } from './MarketStatus.jsx'
import { HeaderSearch } from './HeaderSearch.jsx'
import { formatTime } from '../../utils/formatters.js'
import { useApp } from '../../context/AppContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'

export function Header({ onSettingsOpen }) {
  const [time, setTime] = useState(formatTime(new Date()))
  const { addToast } = useApp()
  const { theme, toggleTheme } = useTheme()

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
        addToast(`✅ Symbols refreshed: ${data.universe} stocks + ${data.niftyFO} F&O loaded`, 'success')
      } else {
        addToast('❌ Failed to refresh symbols', 'error')
      }
    } catch {
      addToast('❌ Server not reachable', 'error')
    }
  }

  return (
    <div className="sticky top-0 z-40 flex-shrink-0">
      <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center px-4 md:px-6 gap-3">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-base md:text-lg font-bold text-[var(--accent)]">Stocky</span>
          <span className="text-base md:text-lg font-bold text-[var(--text-primary)] hidden sm:inline">NSE Dashboard</span>
          <span className="text-base md:text-lg font-bold text-[var(--text-primary)] sm:hidden">NSE</span>
        </div>

        <HeaderSearch className="hidden md:block w-full max-w-xs ml-4" />

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

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-base"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <button
          onClick={onSettingsOpen}
          title="Settings"
          className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-base"
        >
          ⚙️
        </button>
      </header>

      <div className="md:hidden px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <HeaderSearch />
      </div>
    </div>
  )
}
