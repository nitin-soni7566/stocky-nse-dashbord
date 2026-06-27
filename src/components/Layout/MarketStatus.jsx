import { useMarketStatus } from '../../hooks/useMarketStatus.js'

export function MarketStatus() {
  const { session } = useMarketStatus()

  const full = session === 'open'
    ? '🟢 MARKET OPEN 09:15 – 15:30'
    : session === 'pre-open'
    ? '🟡 PRE-OPEN 09:00 – 09:15'
    : '🔴 MARKET CLOSED'

  const short = session === 'open' ? '🟢 OPEN' : session === 'pre-open' ? '🟡 PRE' : '🔴 CLOSED'

  const color = session === 'open'
    ? 'text-green-400 bg-green-900/20 border-green-800'
    : session === 'pre-open'
    ? 'text-yellow-400 bg-yellow-900/20 border-yellow-800'
    : 'text-red-400 bg-red-900/20 border-red-800'

  return (
    <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium border ${color} font-mono`}>
      <span className="hidden sm:inline">{full}</span>
      <span className="sm:hidden">{short}</span>
    </span>
  )
}
