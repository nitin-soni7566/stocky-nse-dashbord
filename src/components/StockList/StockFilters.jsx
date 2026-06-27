import { useState, useEffect } from 'react'

const SORT_OPTIONS = [
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
  { value: 'change-asc', label: 'Chg% ↑' },
  { value: 'change-desc', label: 'Chg% ↓' },
  { value: 'volume-asc', label: 'Vol ↑' },
  { value: 'volume-desc', label: 'Vol ↓' }
]

const FILTER_TABS = ['All', 'Gainers', 'Losers', 'Unchanged']

export function StockFilters({ filters, onChange, onRefresh, lastUpdated }) {
  const [searchInput, setSearchInput] = useState(filters.search)

  useEffect(() => {
    const t = setTimeout(() => onChange({ ...filters, search: searchInput }), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const lastUpdatedText = lastUpdated
    ? (() => {
        const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
        if (diff < 60) return `${diff}s ago`
        return `${Math.floor(diff / 60)}m ago`
      })()
    : null

  return (
    <div className="flex flex-col gap-2 px-3 md:px-4 py-2 md:py-3 border-b border-[var(--border)]">
      {/* Row 1: search + sort + refresh */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search symbol or name..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] flex-1 min-w-0"
        />
        <select
          value={filters.sort}
          onChange={e => onChange({ ...filters, sort: e.target.value })}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] flex-shrink-0"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          onClick={onRefresh}
          className="px-2 md:px-3 py-1.5 text-xs rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors flex-shrink-0"
        >
          ↻
        </button>
      </div>

      {/* Row 2: filter tabs + last updated */}
      <div className="flex items-center gap-1 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => onChange({ ...filters, tab })}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors
              ${filters.tab === tab
                ? 'bg-[var(--accent)] text-black'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
              }`}
          >
            {tab}
          </button>
        ))}
        {lastUpdatedText && (
          <span className="text-xs text-[var(--text-muted)] ml-auto">{lastUpdatedText}</span>
        )}
      </div>
    </div>
  )
}
