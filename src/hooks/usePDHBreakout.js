import { useState, useEffect, useRef } from 'react'
import { fetchOHLCHistory, fetchIntradayCandles } from '../utils/upstoxApi.js'

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function istNow() {
  return new Date(Date.now() + 5.5 * 3600 * 1000)
}

function istMinutesSinceMidnight() {
  const ist = istNow()
  return ist.getUTCHours() * 60 + ist.getUTCMinutes()
}

function istDateKey() {
  return istNow().toISOString().slice(0, 10)
}

// Module-level cache: the 09:30 candle is finalized intraday history once it closes,
// so a stock's flag never needs recomputing after its first check — it survives tab
// switches / filter changes and is only ever computed once per symbol/day/mode (mode
// is part of the key since breakout vs breakdown are different conditions for the
// same symbol).
const _cache = new Map()   // "YYYY-MM-DD:mode:yahooSymbol" -> boolean

const BATCH = 5
const BATCH_DELAY = 400
const CANDLE_TIME = '09:30'
const READY_AFTER_MINS = 9 * 60 + 31   // candle closes at 09:31 IST

// Flags stocks whose 09:30 1-minute candle broke through the previous day's
// high (mode: 'breakout', for Gainers/F&O) or low (mode: 'breakdown', for Losers —
// checking for fresh highs on declining stocks doesn't make sense; fresh lows do).
// `stocks` is whatever the caller currently displays (Gainers/Losers/F&O) — scoped
// to that list (not the full ~750-stock universe) to bound network calls, and
// batched/cached the same way useScanner/useVolumeShocker are.
export function usePDHBreakout(stocks, mode = 'breakout') {
  const [breakouts, setBreakouts] = useState(() => new Set())
  const stocksRef = useRef(stocks)
  stocksRef.current = stocks
  const runningRef = useRef(false)
  const cancelRef = useRef(false)

  const symbolsKey = [...new Set(stocks.map(s => s.yahooSymbol))].sort().join(',')

  useEffect(() => {
    cancelRef.current = false
    // Reset on every (list, mode) change — re-populated synchronously below from
    // cache before this commits, so already-known flags don't visibly flash away.
    // Necessary because mode can switch (Gainers/F&O -> Losers) on the same hook
    // instance, and a symbol's breakout-mode flag must not leak into breakdown mode.
    setBreakouts(new Set())

    const tryRun = async () => {
      if (runningRef.current || cancelRef.current) return
      if (istMinutesSinceMidnight() < READY_AFTER_MINS) return

      const dateKey = istDateKey()
      const list = stocksRef.current
      const pending = []
      const already = []
      for (const s of list) {
        const cacheKey = `${dateKey}:${mode}:${s.yahooSymbol}`
        if (_cache.has(cacheKey)) {
          if (_cache.get(cacheKey)) already.push(s.yahooSymbol)
        } else {
          pending.push(s)
        }
      }
      if (already.length) {
        setBreakouts(prev => new Set([...prev, ...already]))
      }
      if (!pending.length) return

      runningRef.current = true
      try {
        for (let i = 0; i < pending.length; i += BATCH) {
          if (cancelRef.current) return
          const batch = pending.slice(i, i + BATCH)
          const found = []

          await Promise.allSettled(batch.map(async (s) => {
            try {
              const [history, intraday] = await Promise.all([
                fetchOHLCHistory(s.yahooSymbol, 2),
                fetchIntradayCandles(s.yahooSymbol)
              ])
              const prevCandle = history && history.length >= 2 ? history[history.length - 2] : null
              const candle930 = intraday?.find(c => c.istTime === CANDLE_TIME) ?? null
              const broken = mode === 'breakdown'
                ? (prevCandle?.low != null && candle930?.low != null && candle930.low < prevCandle.low)
                : (prevCandle?.high != null && candle930?.high != null && candle930.high > prevCandle.high)
              _cache.set(`${dateKey}:${mode}:${s.yahooSymbol}`, broken)
              if (broken) found.push(s.yahooSymbol)
            } catch {
              // skip failed stocks — leave uncached so it's retried next pass
            }
          }))

          if (found.length && !cancelRef.current) {
            setBreakouts(prev => new Set([...prev, ...found]))
          }
          if (i + BATCH < pending.length && !cancelRef.current) await delay(BATCH_DELAY)
        }
      } finally {
        runningRef.current = false
      }
    }

    tryRun()
    // Re-checks periodically so (a) the scan kicks off automatically once the
    // market crosses 09:31 and (b) newly-ranked-in stocks get picked up.
    const iv = setInterval(tryRun, 30000)
    return () => { cancelRef.current = true; clearInterval(iv) }
  }, [symbolsKey, mode])

  return breakouts
}
