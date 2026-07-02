import { useState, useEffect } from 'react'
import { isMarketOpen } from '../../utils/marketHours.js'

const SORT_OPTIONS = [
  { value: 'change-desc', label: 'Gainers First' },
  { value: 'change-asc',  label: 'Losers First' },
  { value: 'price-desc',  label: 'Price: High→Low' },
  { value: 'price-asc',   label: 'Price: Low→High' },
  { value: 'volume-desc', label: 'Volume: High→Low' },
  { value: 'volume-asc',  label: 'Volume: Low→High' },
]

const FILTER_TABS = ['All', 'Gainers', 'Losers', 'Unchanged']

export function StockFilters({ filters, onChange, onRefresh, lastUpdated, dataSource }) {
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
        <span className="ml-auto flex items-center gap-2">
          {!isMarketOpen() ? (
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] inline-block" />
              Market closed · last price
            </span>
          ) : dataSource === 'upstox-live' ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              LIVE · Upstox
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] inline-block" />
              Upstox · polling
            </span>
          )}
          {lastUpdatedText && (
            <span className="text-xs text-[var(--text-muted)]">{lastUpdatedText}</span>
          )}
        </span>
      </div>
    </div>
  )
}
