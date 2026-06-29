import { useState, useCallback, useRef } from 'react'
import { fetchOHLCHistory, fetchIntradayCandles, get915Candle } from '../utils/yahooApi.js'
import { isDoji, getDojiStrength, isBreakout, getBreakoutPct } from '../utils/dojiLogic.js'

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export function useScanner() {
  const [results, setResults] = useState([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [timeRemaining, setTimeRemaining] = useState(null)
  const cancelRef = useRef(false)

  const runScan = useCallback(async (symbols, options = { doji: true, breakout: true, breakoutTime: '09:15' }) => {
    cancelRef.current = false
    setScanning(true)
    setResults([])
    setProgress({ current: 0, total: symbols.length })

    const scanResults = []
    const BATCH = 5
    const startTime = Date.now()

    for (let i = 0; i < symbols.length; i += BATCH) {
      if (cancelRef.current) break

      const batch = symbols.slice(i, i + BATCH)
      const elapsed = Date.now() - startTime
      const doneCount = i
      if (doneCount > 0) {
        const perStock = elapsed / doneCount
        const remaining = Math.ceil(((symbols.length - doneCount) * perStock) / 1000)
        setTimeRemaining(remaining)
      }

      await Promise.allSettled(
        batch.map(async (stock) => {
          if (cancelRef.current) return
          try {
            const [history, intraday] = await Promise.all([
              options.doji ? fetchOHLCHistory(stock.yahooSymbol, 5) : Promise.resolve(null),
              options.breakout ? fetchIntradayCandles(stock.yahooSymbol) : Promise.resolve(null)
            ])

            const yesterdayCandle = history && history.length >= 2 ? history[history.length - 2] : null
            const nifteenCandle = intraday ? get915Candle(intraday, options.breakoutTime ?? '09:15') : null
            const todayClose = history?.[history.length - 1]?.close ?? null
            const currentPrice = todayClose

            const dojiResult = options.doji && yesterdayCandle ? isDoji(yesterdayCandle) : false
            const breakoutResult = options.breakout && nifteenCandle && currentPrice != null
              ? isBreakout(currentPrice, nifteenCandle)
              : false

            if (!options.doji && !options.breakout) return
            if (options.doji && options.breakout && !dojiResult && !breakoutResult) return
            if (options.doji && !options.breakout && !dojiResult) return
            if (options.breakout && !options.doji && !breakoutResult) return

            let signal = 'DOJI ONLY'
            if (dojiResult && breakoutResult) signal = 'STRONG'
            else if (breakoutResult && !dojiResult) signal = 'BREAKOUT ONLY'

            const prevClose = yesterdayCandle?.close ?? null
            const changePct = currentPrice != null && prevClose != null
              ? ((currentPrice - prevClose) / prevClose) * 100
              : null

            scanResults.push({
              symbol: stock.symbol,
              name: stock.name,
              sector: stock.sector ?? null,
              dojiBodyPct: yesterdayCandle ? getDojiStrength(yesterdayCandle) : null,
              prevDayRange: yesterdayCandle ? (yesterdayCandle.high - yesterdayCandle.low).toFixed(2) : null,
              nifteenHigh: nifteenCandle?.high ?? null,
              currentPrice,
              changePct,
              breakoutPct: nifteenCandle && currentPrice != null ? getBreakoutPct(currentPrice, nifteenCandle) : null,
              signal,
              isDoji: dojiResult,
              isBreakout: breakoutResult
            })
          } catch {
            // skip failed stocks
          }
        })
      )

      setProgress({ current: Math.min(i + BATCH, symbols.length), total: symbols.length })
      if (i + BATCH < symbols.length && !cancelRef.current) await delay(500)
    }

    scanResults.sort((a, b) => parseFloat(b.breakoutPct ?? -999) - parseFloat(a.breakoutPct ?? -999))
    setResults(scanResults)
    setScanning(false)
    setTimeRemaining(null)
  }, [])

  const cancel = useCallback(() => {
    cancelRef.current = true
    setScanning(false)
  }, [])

  return { results, scanning, progress, timeRemaining, runScan, cancel }
}
