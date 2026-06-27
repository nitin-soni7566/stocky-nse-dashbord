import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchBulkQuotes } from '../utils/yahooApi.js'
import { isMarketOpen } from '../utils/marketHours.js'

export function useStockData(symbols) {
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const prevQuotes = useRef({})

  const refresh = useCallback(async () => {
    if (!symbols?.length) return
    const yahooSymbols = symbols.map(s => s.yahooSymbol)
    const data = await fetchBulkQuotes(yahooSymbols)
    prevQuotes.current = quotes
    setQuotes(data)
    setLastUpdated(new Date())
    setLoading(false)
  }, [symbols])

  useEffect(() => {
    setLoading(true)
    setQuotes({})
    refresh()
  }, [symbols])

  useEffect(() => {
    if (!isMarketOpen()) return
    const interval = setInterval(refresh, 60000)
    return () => clearInterval(interval)
  }, [refresh])

  return { quotes, loading, lastUpdated, refresh, prevQuotes: prevQuotes.current }
}
