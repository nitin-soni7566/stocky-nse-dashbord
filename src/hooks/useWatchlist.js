import { useState, useCallback, useEffect } from 'react'

const KEY = 'app_watchlist'

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

// Simple localStorage-backed watchlist, keyed by our `symbol` (not yahooSymbol).
// Mirrors SettingsPanel's app_settings persistence pattern.
export function useWatchlist() {
  const [symbols, setSymbols] = useState(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(symbols))
  }, [symbols])

  const isFavorite = useCallback(symbol => symbols.includes(symbol), [symbols])

  const toggle = useCallback(symbol => {
    setSymbols(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol])
  }, [])

  return { symbols, isFavorite, toggle }
}
