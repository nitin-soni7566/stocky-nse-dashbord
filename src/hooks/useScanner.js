import { useState, useCallback, useRef } from 'react'
import { fetchOHLCHistory, fetchIntradayCandles, get915Candle } from '../utils/upstoxApi.js'
import { isDoji, getDojiStrength, isBreakout, getBreakoutPct } from '../utils/dojiLogic.js'
import { computeRSI, computeEMA, computeSMA, computeVWAP, computeGapPct } from '../utils/indicators.js'

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export const DEFAULT_SCAN_OPTIONS = {
  doji: true,
  breakout: true, breakoutTime: '09:15',
  rsi: false, rsiPeriod: 14, rsiMin: null, rsiMax: null,
  ema: false, emaPeriod: 20, emaCondition: 'above',
  sma: false, smaPeriod: 20, smaCondition: 'above',
  vwap: false, vwapCondition: 'above',
  gap: false, gapDirection: 'up', gapThreshold: 2
}

function historyDaysNeeded(options) {
  let days = 2
  if (options.doji) days = Math.max(days, 5)
  if (options.rsi) days = Math.max(days, options.rsiPeriod + 10)
  if (options.ema) days = Math.max(days, options.emaPeriod + 15)
  if (options.sma) days = Math.max(days, options.smaPeriod + 2)
  return days
}

// Indicator/history-derived filters — require a batched historical-candle fetch,
// unlike live fields (price/volume/change%) which the caller filters reactively
// from the already-streaming quotes map instead of going through here.
export function useScanner() {
  const [results, setResults] = useState([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [timeRemaining, setTimeRemaining] = useState(null)
  const cancelRef = useRef(false)

  const runScan = useCallback(async (symbols, options = DEFAULT_SCAN_OPTIONS) => {
    const opts = { ...DEFAULT_SCAN_OPTIONS, ...options }
    cancelRef.current = false
    setScanning(true)
    setResults([])
    setProgress({ current: 0, total: symbols.length })

    const needsHistory = opts.doji || opts.rsi || opts.ema || opts.sma || opts.gap
    const needsIntraday = opts.breakout || opts.vwap
    const days = historyDaysNeeded(opts)

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
              needsHistory ? fetchOHLCHistory(stock.yahooSymbol, days) : Promise.resolve(null),
              needsIntraday ? fetchIntradayCandles(stock.yahooSymbol) : Promise.resolve(null)
            ])

            const closes = history?.map(c => c.close).filter(v => v != null) ?? []
            const yesterdayCandle = history && history.length >= 2 ? history[history.length - 2] : null
            const todayCandle = history?.[history.length - 1] ?? null
            const currentPrice = todayCandle?.close ?? null
            const nifteenCandle = intraday ? get915Candle(intraday, opts.breakoutTime ?? '09:15') : null

            const dojiResult = opts.doji && yesterdayCandle ? isDoji(yesterdayCandle) : false
            const breakoutResult = opts.breakout && nifteenCandle && currentPrice != null
              ? isBreakout(currentPrice, nifteenCandle)
              : false

            const rsiValue = opts.rsi ? computeRSI(closes, opts.rsiPeriod) : null
            const emaValue = opts.ema ? computeEMA(closes, opts.emaPeriod) : null
            const smaValue = opts.sma ? computeSMA(closes, opts.smaPeriod) : null
            const vwapValue = opts.vwap ? computeVWAP(intraday) : null
            const gapPct = opts.gap ? computeGapPct(todayCandle?.open, yesterdayCandle?.close) : null

            let passes = true
            let anyFilterActive = false

            if (opts.doji) { anyFilterActive = true; if (!dojiResult) passes = false }
            if (opts.breakout) { anyFilterActive = true; if (!breakoutResult) passes = false }
            if (opts.rsi) {
              anyFilterActive = true
              if (rsiValue == null) passes = false
              else {
                if (opts.rsiMin != null && rsiValue < opts.rsiMin) passes = false
                if (opts.rsiMax != null && rsiValue > opts.rsiMax) passes = false
              }
            }
            if (opts.ema) {
              anyFilterActive = true
              if (emaValue == null || currentPrice == null) passes = false
              else if (opts.emaCondition === 'below' ? currentPrice >= emaValue : currentPrice < emaValue) passes = false
            }
            if (opts.sma) {
              anyFilterActive = true
              if (smaValue == null || currentPrice == null) passes = false
              else if (opts.smaCondition === 'below' ? currentPrice >= smaValue : currentPrice < smaValue) passes = false
            }
            if (opts.vwap) {
              anyFilterActive = true
              if (vwapValue == null || currentPrice == null) passes = false
              else if (opts.vwapCondition === 'below' ? currentPrice >= vwapValue : currentPrice < vwapValue) passes = false
            }
            if (opts.gap) {
              anyFilterActive = true
              if (gapPct == null) passes = false
              else if (opts.gapDirection === 'down' ? gapPct > -opts.gapThreshold : gapPct < opts.gapThreshold) passes = false
            }

            if (!anyFilterActive || !passes) return

            let signal = 'MATCH'
            if (dojiResult && breakoutResult) signal = 'STRONG'
            else if (breakoutResult) signal = 'BREAKOUT ONLY'
            else if (dojiResult) signal = 'DOJI ONLY'

            const prevClose = yesterdayCandle?.close ?? null
            const changePct = currentPrice != null && prevClose != null
              ? ((currentPrice - prevClose) / prevClose) * 100
              : null

            scanResults.push({
              symbol: stock.symbol,
              name: stock.name,
              sector: stock.sector ?? null,
              currentPrice,
              changePct,
              volume: todayCandle?.volume ?? null,
              dojiBodyPct: yesterdayCandle ? getDojiStrength(yesterdayCandle) : null,
              prevDayRange: yesterdayCandle ? (yesterdayCandle.high - yesterdayCandle.low).toFixed(2) : null,
              nifteenHigh: nifteenCandle?.high ?? null,
              breakoutPct: nifteenCandle && currentPrice != null ? getBreakoutPct(currentPrice, nifteenCandle) : null,
              rsi: rsiValue,
              ema: emaValue,
              sma: smaValue,
              vwap: vwapValue,
              gapPct,
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

    scanResults.sort((a, b) => (b.changePct ?? -999) - (a.changePct ?? -999))
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
