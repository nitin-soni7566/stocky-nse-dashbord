import { formatINR, formatVolume } from '../../utils/formatters.js'
import { Badge } from '../UI/Badge.jsx'
import { ChangePill } from '../UI/ChangePill.jsx'
import { StockCard } from '../UI/StockCard.jsx'
import { VirtualCardList } from '../UI/VirtualCardList.jsx'
import { findStock } from '../../utils/instruments.js'
import { useWatchlist } from '../../hooks/useWatchlist.js'

function SignalBadge({ signal }) {
  if (signal === 'STRONG') return <Badge variant="green">🟢 STRONG</Badge>
  if (signal === 'DOJI ONLY') return <Badge variant="yellow">🟡 DOJI</Badge>
  if (signal === 'BREAKOUT ONLY') return <Badge variant="blue">🔵 BREAKOUT</Badge>
  if (signal === 'MATCH') return <Badge variant="accent">✓ MATCH</Badge>
  return null
}

function ResultBadges({ r }) {
  return (
    <>
      <SignalBadge signal={r.signal} />
      {r.rsi != null && <Badge>RSI {r.rsi.toFixed(0)}</Badge>}
      {r.gapPct != null && <Badge variant={r.gapPct >= 0 ? 'green' : 'red'}>GAP {r.gapPct >= 0 ? '+' : ''}{r.gapPct.toFixed(1)}%</Badge>}
    </>
  )
}

export function ScannerResults({ results, onSelect }) {
  const { isFavorite, toggle: toggleFavorite } = useWatchlist()

  if (!results.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="text-5xl">🔍</div>
        <p className="text-lg font-semibold text-[var(--text-primary)]">No stocks matched</p>
        <p className="text-sm text-[var(--text-muted)] max-w-xs">
          Try loosening a filter, or scan during market hours (9:15–15:30 IST).
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 text-sm text-[var(--text-secondary)] px-1">
        Found <span className="font-semibold text-[var(--accent)]">{results.length}</span> matching stocks
      </div>

      {/* Mobile: card stack, no horizontal scroll */}
      <div className="md:hidden flex flex-col" style={{ height: Math.min(results.length * 128, 560) }}>
        <VirtualCardList
          items={results}
          itemHeight={118}
          renderItem={r => {
            const stock = findStock(r.symbol)
            if (!stock) return null
            return (
              <StockCard
                stock={stock}
                quote={{ price: r.currentPrice, changePct: r.changePct, volume: r.volume }}
                isFavorite={isFavorite(stock.symbol)}
                onToggleFavorite={toggleFavorite}
                onClick={() => onSelect?.(r)}
                extra={<ResultBadges r={r} />}
              />
            )
          }}
        />
      </div>

      {/* Desktop: dense table */}
      <div className="hidden md:block overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead className="sticky top-0 bg-[var(--bg-secondary)]">
          <tr className="border-b border-[var(--border)]">
            {['Symbol', 'Company', 'Price', 'Chg%', 'Volume', 'Signals'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map(r => (
            <tr
              key={r.symbol}
              onClick={() => onSelect?.(r)}
              className={`border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors ${onSelect ? 'cursor-pointer' : ''}`}
            >
              <td className="px-3 py-3 font-mono font-semibold text-sm text-[var(--accent)]">{r.symbol}</td>
              <td className="px-3 py-3 text-xs text-[var(--text-secondary)] max-w-[160px] truncate">{r.name}</td>
              <td className="px-3 py-3 font-mono text-sm text-[var(--text-primary)]">
                {r.currentPrice != null ? formatINR(r.currentPrice) : '—'}
              </td>
              <td className="px-3 py-3"><ChangePill value={r.changePct} /></td>
              <td className="px-3 py-3 font-mono text-sm text-[var(--text-secondary)]">
                {r.volume != null ? formatVolume(r.volume) : '—'}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ResultBadges r={r} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
