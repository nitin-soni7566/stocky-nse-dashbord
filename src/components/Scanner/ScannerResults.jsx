import { formatINR } from '../../utils/formatters.js'
import { Badge } from '../UI/Badge.jsx'
import { ChangePill } from '../UI/ChangePill.jsx'

function SignalBadge({ signal }) {
  if (signal === 'STRONG') return <Badge variant="green">🟢 STRONG</Badge>
  if (signal === 'DOJI ONLY') return <Badge variant="yellow">🟡 DOJI ONLY</Badge>
  if (signal === 'BREAKOUT ONLY') return <Badge variant="blue">🔵 BREAKOUT ONLY</Badge>
  return null
}

export function ScannerResults({ results }) {
  if (!results.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="text-5xl">🔍</div>
        <p className="text-lg font-semibold text-[var(--text-primary)]">No stocks matched</p>
        <p className="text-sm text-[var(--text-muted)] max-w-xs">
          Try scanning during market hours (9:15–15:30 IST).
          Doji patterns form at end of day — best to scan next morning.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="mb-3 text-sm text-[var(--text-secondary)] px-1">
        Found <span className="font-semibold text-[var(--accent)]">{results.length}</span> matching stocks
      </div>
      <table className="w-full min-w-[700px]">
        <thead className="sticky top-0 bg-[var(--bg-secondary)]">
          <tr className="border-b border-[var(--border)]">
            {['Symbol', 'Company', 'Doji Body%', 'Prev Range', '9:15 High', 'Current Price', 'Breakout%', 'Signal'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map(r => (
            <tr key={r.symbol} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors">
              <td className="px-3 py-3 font-mono font-semibold text-sm text-[var(--accent)]">{r.symbol}</td>
              <td className="px-3 py-3 text-xs text-[var(--text-secondary)] max-w-[160px] truncate">{r.name}</td>
              <td className="px-3 py-3 font-mono text-sm text-[var(--text-secondary)]">
                {r.dojiBodyPct != null ? `${r.dojiBodyPct}%` : '—'}
              </td>
              <td className="px-3 py-3 font-mono text-sm text-[var(--text-secondary)]">
                {r.prevDayRange != null ? `₹${r.prevDayRange}` : '—'}
              </td>
              <td className="px-3 py-3 font-mono text-sm text-[var(--text-secondary)]">
                {r.nifteenHigh != null ? formatINR(r.nifteenHigh) : '—'}
              </td>
              <td className="px-3 py-3 font-mono text-sm text-[var(--text-primary)]">
                {r.currentPrice != null ? formatINR(r.currentPrice) : '—'}
              </td>
              <td className="px-3 py-3">
                <ChangePill value={r.breakoutPct != null ? parseFloat(r.breakoutPct) : null} />
              </td>
              <td className="px-3 py-3">
                <SignalBadge signal={r.signal} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
