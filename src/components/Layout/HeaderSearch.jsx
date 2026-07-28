import { useState, useMemo, useRef, useEffect } from 'react'
import { ALL_STOCKS } from '../../utils/instruments.js'
import { useDebouncedValue } from '../../hooks/useDebounce.js'
import { useApp } from '../../context/AppContext.jsx'

// Global symbol/name search shared by desktop (inline, in Header) and mobile
// (a dedicated sticky row under the header) — both instances share this one
// component so match logic + the OPEN_STOCK_DETAIL wiring live in one place.
export function HeaderSearch({ className = '' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebouncedValue(query, 200)
  const { dispatch } = useApp()
  const rootRef = useRef(null)

  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    if (!q) return []
    return ALL_STOCKS
      .filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [debounced])

  useEffect(() => {
    const onClick = e => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const select = stock => {
    dispatch({ type: 'OPEN_STOCK_DETAIL', payload: stock.symbol })
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search stocks..."
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {open && debounced.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-[var(--text-muted)]">No stocks matched "{debounced}"</div>
          ) : results.map(stock => (
            <button
              key={stock.symbol}
              onClick={() => select(stock)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border)] last:border-b-0"
            >
              <div className="min-w-0">
                <div className="font-mono font-semibold text-sm text-[var(--accent)]">{stock.symbol}</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate max-w-[220px]">{stock.name}</div>
              </div>
              {stock.sector && (
                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded flex-shrink-0">{stock.sector}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
