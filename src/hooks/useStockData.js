import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchBulkQuotes, getUpstoxStatus, subscribeQuotes } from '../utils/upstoxApi.js'
import { isMarketOpen } from '../utils/marketHours.js'

export function useStockData(symbols) {
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [dataSource, setDataSource] = useState('upstox-poll')  // 'upstox-live' | 'upstox-poll'
  const [streaming, setStreaming] = useState(null)             // null = unknown yet
  const prevQuotes = useRef({})

  // Detect streaming capability once (WS relay available in dev, not on Netlify).
  useEffect(() => {
    getUpstoxStatus().then(s => setStreaming(!!s.streaming))
  }, [])

  const yahooSymbols = symbols?.map(s => s.yahooSymbol) ?? []
  const symbolsKey = yahooSymbols.join(',')

  const applyQuotes = useCallback(next => {
    setQuotes(prev => {
      prevQuotes.current = prev
      return { ...prev, ...next }
    })
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    if (!yahooSymbols.length) return
    const data = await fetchBulkQuotes(yahooSymbols)
    if (Object.keys(data).length) applyQuotes(data)
    else setLoading(false)
  }, [symbolsKey, applyQuotes])

  // Reset when the symbol set changes.
  useEffect(() => {
    setLoading(true)
    setQuotes({})
    prevQuotes.current = {}
  }, [symbolsKey])

  // Live stream (dev) or polling (prod), decided by `streaming`.
  useEffect(() => {
    if (streaming === null || !yahooSymbols.length) return

    refresh()   // initial snapshot regardless of mode

    if (streaming) {
      setDataSource('upstox-live')
      const unsubscribe = subscribeQuotes(yahooSymbols, applyQuotes)
      return unsubscribe
    }

    setDataSource('upstox-poll')
    if (!isMarketOpen()) return
    const interval = setInterval(refresh, 2000)
    return () => clearInterval(interval)
  }, [streaming, symbolsKey, refresh, applyQuotes])

  return { quotes, loading, lastUpdated, refresh, prevQuotes: prevQuotes.current, dataSource }
}
