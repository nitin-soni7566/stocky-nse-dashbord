import { useMemo } from 'react'
import { useStockData } from './useStockData.js'
import { ALL_STOCKS } from '../utils/instruments.js'
import { getTopGainers, getTopLosers } from '../utils/rankings.js'

// Live-ranked Top 100 Gainers/Losers over the full NSE stock universe.
// Shares useStockData's live-SSE/2s-poll plumbing (already proven at this
// scale via the former "Nifty Total" list), so rankings stay real-time.
export function useGainersLosers(limit = 100) {
  const { quotes, loading, lastUpdated, dataSource, refresh } = useStockData(ALL_STOCKS)

  const gainers = useMemo(() => getTopGainers(ALL_STOCKS, quotes, limit), [quotes, limit])
  const losers = useMemo(() => getTopLosers(ALL_STOCKS, quotes, limit), [quotes, limit])

  return { gainers, losers, quotes, loading, lastUpdated, dataSource, refresh }
}
