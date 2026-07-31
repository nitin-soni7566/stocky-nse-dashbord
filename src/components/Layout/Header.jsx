import { useState, useEffect, useRef } from 'react'
import { MarketStatus } from './MarketStatus.jsx'
import { HeaderSearch } from './HeaderSearch.jsx'
import { formatTime } from '../../utils/formatters.js'
import { useApp } from '../../context/AppContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'

export function Header({ onSettingsOpen }) {
  const [time, setTime] = useState(formatTime(new Date()))
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const searchRef = useRef(null)
  const searchToggleRef = useRef(null)
  const { addToast } = useApp()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime(new Date())), 1000)
    return () => clearInterval(t)
  }, [])

  // Mobile search is a toggleable overlay (not a permanent row) — closes on
  // outside tap or Escape so it doesn't cost screen space when not in use.
  useEffect(() => {
    if (!mobileSearchOpen) return
    const onClick = e => {
      if (searchRef.current?.contains(e.target)) return
      if (searchToggleRef.current?.contains(e.target)) return   // let the button's own onClick handle the toggle
      setMobileSearchOpen(false)
    }
    const onKey = e => { if (e.key === 'Escape') setMobileSearchOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [mobileSearchOpen])

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

  const iconBtn = 'w-9 h-9 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-base flex-shrink-0'

  return (
    <div className="sticky top-0 z-40 flex-shrink-0 relative">
      <header className="h-12 md:h-14 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex items-center px-3 md:px-6 gap-2 md:gap-3">
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
          ref={searchToggleRef}
          onClick={() => setMobileSearchOpen(v => !v)}
          title="Search"
          aria-label="Search stocks"
          className={`${iconBtn} md:hidden`}
        >
          🔍
        </button>

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className={iconBtn}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <button
          onClick={onSettingsOpen}
          title="Settings"
          className={iconBtn}
        >
          ⚙️
        </button>
      </header>

      {mobileSearchOpen && (
        <div ref={searchRef} className="md:hidden absolute left-0 right-0 top-full px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl z-40">
          <HeaderSearch autoFocus onSelect={() => setMobileSearchOpen(false)} />
        </div>
      )}
    </div>
  )
}
