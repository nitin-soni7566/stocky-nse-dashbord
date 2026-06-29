import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchBulkQuotes } from '../utils/yahooApi.js'
import { fetchDhanQuotes, getDhanStatus } from '../utils/dhanApi.js'
import { isMarketOpen } from '../utils/marketHours.js'

export function useStockData(symbols) {
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [dataSource, setDataSource] = useState('yahoo')  // 'dhan' | 'yahoo'
  const [useDhan, setUseDhan] = useState(false)
  const prevQuotes = useRef({})

  // Check Dhan availability once on mount
  useEffect(() => {
    getDhanStatus().then(s => setUseDhan(s.configured))
  }, [])

  const refresh = useCallback(async () => {
    if (!symbols?.length) return
    const yahooSymbols = symbols.map(s => s.yahooSymbol)

    let data = {}
    let source = 'yahoo'

    if (useDhan) {
      data = await fetchDhanQuotes(yahooSymbols)
      if (Object.keys(data).length > 0) source = 'dhan'
    }

    // Yahoo Finance for index symbols (^NSEI etc) and as fallback for any missing
    const missing = yahooSymbols.filter(s => !data[s])
    if (missing.length) {
      const yData = await fetchBulkQuotes(missing)
      data = { ...data, ...yData }
    }

    prevQuotes.current = quotes
    setQuotes(data)
    setDataSource(source)
    setLastUpdated(new Date())
    setLoading(false)
  }, [symbols, useDhan])

  useEffect(() => {
    setLoading(true)
    setQuotes({})
  }, [symbols])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!isMarketOpen()) return
    // Dhan: poll every 5 seconds. Yahoo Finance: every 60 seconds.
    const interval = setInterval(refresh, useDhan ? 5000 : 60000)
    return () => clearInterval(interval)
  }, [refresh, useDhan])

  return { quotes, loading, lastUpdated, refresh, prevQuotes: prevQuotes.current, dataSource }
}
