import { useState, useCallback, useRef } from 'react'
import { fetchOHLCHistory } from '../utils/upstoxApi.js'

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export function useVolumeShocker() {
  const [results, setResults] = useState([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [timeRemaining, setTimeRemaining] = useState(null)
  const cancelRef = useRef(false)

  const runScan = useCallback(async (symbols, threshold = 2) => {
    cancelRef.current = false
    setScanning(true)
    setResults([])
    setProgress({ current: 0, total: symbols.length })

    const found = []
    const BATCH = 5
    const startTime = Date.now()

    for (let i = 0; i < symbols.length; i += BATCH) {
      if (cancelRef.current) break

      const batch = symbols.slice(i, i + BATCH)
      const elapsed = Date.now() - startTime
      if (i > 0) {
        const perStock = elapsed / i
        setTimeRemaining(Math.ceil(((symbols.length - i) * perStock) / 1000))
      }

      await Promise.allSettled(
        batch.map(async (stock) => {
          if (cancelRef.current) return
          try {
            const history = await fetchOHLCHistory(stock.yahooSymbol, 22)
            if (!history || history.length < 3) return

            const today = history[history.length - 1]
            const past = history.slice(0, -1)

            const validPast = past.filter(d => d.volume != null && d.volume > 0)
            if (validPast.length < 5) return

            const avgVolume = validPast.reduce((s, d) => s + d.volume, 0) / validPast.length
            if (!avgVolume || !today.volume) return

            const volumeRatio = today.volume / avgVolume
            if (volumeRatio < threshold) return

            const prevClose = past[past.length - 1].close
            const changePct = prevClose ? ((today.close - prevClose) / prevClose) * 100 : null

            found.push({
              symbol: stock.symbol,
              name: stock.name,
              sector: stock.sector ?? 'Unknown',
              price: today.close,
              changePct,
              todayVolume: today.volume,
              avgVolume: Math.round(avgVolume),
              volumeRatio,
              daysData: validPast.length
            })
          } catch {
            // skip
          }
        })
      )

      setProgress({ current: Math.min(i + BATCH, symbols.length), total: symbols.length })
      if (i + BATCH < symbols.length && !cancelRef.current) await delay(400)
    }

    found.sort((a, b) => b.volumeRatio - a.volumeRatio)
    setResults(found)
    setScanning(false)
    setTimeRemaining(null)
  }, [])

  const cancel = useCallback(() => {
    cancelRef.current = true
    setScanning(false)
    setTimeRemaining(null)
  }, [])

  return { results, scanning, progress, timeRemaining, runScan, cancel }
}
