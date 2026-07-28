import { useEffect } from 'react'
import { formatINR, formatChange } from '../../utils/formatters.js'
import { StockCard } from '../UI/StockCard.jsx'
import { VirtualCardList } from '../UI/VirtualCardList.jsx'
import { useWatchlist } from '../../hooks/useWatchlist.js'

export function SectorModal({ sector, stocks, onClose, onSelect }) {
  const { isFavorite, toggle: toggleFavorite } = useWatchlist()

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const sorted = [...stocks].sort((a, b) => (b.quote?.changePct ?? -999) - (a.quote?.changePct ?? -999))

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{sector}</h2>
            <p className="text-xs text-[var(--text-muted)]">{stocks.length} stocks</p>
          </div>
          <button onClick={onClose} className="text-2xl text-[var(--text-muted)] hover:text-[var(--text-primary)] leading-none">×</button>
        </div>
        {/* Mobile: card stack, no horizontal scroll */}
        <div className="md:hidden flex-1 flex flex-col overflow-hidden p-3">
          <VirtualCardList
            items={sorted}
            itemHeight={118}
            renderItem={s => (
              <StockCard
                stock={s}
                quote={s.quote}
                isFavorite={isFavorite(s.symbol)}
                onToggleFavorite={toggleFavorite}
                onClick={stock => onSelect?.(stock.symbol)}
              />
            )}
          />
        </div>

        <div className="hidden md:block overflow-auto flex-1">
          <table className="w-full min-w-[600px]">
            <thead className="sticky top-0 bg-[var(--bg-secondary)]">
              <tr className="border-b border-[var(--border)]">
                {['Symbol', 'Company', 'Price', 'Change', 'Change%', 'High', 'Low', 'Volume'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => {
                const q = s.quote
                const pct = q?.changePct ?? null
                return (
                  <tr
                    key={s.symbol}
                    onClick={() => onSelect?.(s.symbol)}
                    className={`border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors ${onSelect ? 'cursor-pointer' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-sm text-[var(--accent)]">{s.symbol}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)] max-w-[180px] truncate">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-sm text-[var(--text-primary)]">{q?.price != null ? formatINR(q.price) : '—'}</td>
                    <td className={`px-4 py-3 font-mono text-sm ${q?.change >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {q?.change != null ? formatChange(q.change) : '—'}
                    </td>
                    <td className={`px-4 py-3 font-mono text-sm font-medium ${pct >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {pct != null ? formatChange(pct, true) : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{q?.high != null ? formatINR(q.high) : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{q?.low != null ? formatINR(q.low) : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{q?.volume != null ? q.volume.toLocaleString('en-IN') : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
