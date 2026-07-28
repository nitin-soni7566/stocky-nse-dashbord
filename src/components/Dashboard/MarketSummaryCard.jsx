import { useState, useEffect } from 'react'
import { fetchBulkQuotes } from '../../utils/upstoxApi.js'
import { IndexCard } from '../Heatmap/IndexCard.jsx'
import { DashboardCard, ViewAllButton } from './DashboardCard.jsx'
import { useApp } from '../../context/AppContext.jsx'

const SUMMARY_INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50' },
  { symbol: '^BSESN', name: 'SENSEX' },
  { symbol: '^NSEBANK', name: 'NIFTY BANK' },
  { symbol: '^INDIAVIX', name: 'INDIA VIX' },
]

export function MarketSummaryCard() {
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(true)
  const { dispatch } = useApp()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const data = await fetchBulkQuotes(SUMMARY_INDICES.map(i => i.symbol))
      if (!cancelled) { setQuotes(data); setLoading(false) }
    }
    load()
    const iv = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [])

  return (
    <DashboardCard
      title="Market Summary"
      icon="📊"
      gradient
      className="sm:col-span-2 lg:col-span-3"
      action={<ViewAllButton onClick={() => dispatch({ type: 'SET_VIEW', payload: 'heatmap' })} label="Full heatmap" />}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton rounded-xl" style={{ minHeight: 110 }} />)
          : SUMMARY_INDICES.map(idx => (
              <IndexCard key={idx.symbol} index={idx} quote={quotes[idx.symbol]} onClick={() => dispatch({ type: 'SET_VIEW', payload: 'heatmap' })} />
            ))}
      </div>
    </DashboardCard>
  )
}
