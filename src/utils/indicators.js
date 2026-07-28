// Pure technical-indicator math over OHLC candle arrays (oldest→newest), matching
// the hand-rolled style of dojiLogic.js — no external TA library.

export function computeSMA(closes, period) {
  if (!closes || closes.length < period) return null
  const window = closes.slice(-period)
  return window.reduce((a, b) => a + b, 0) / period
}

export function computeEMA(closes, period) {
  if (!closes || closes.length < period) return null
  const k = 2 / (period + 1)
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k)
  }
  return ema
}

// Wilder's RSI.
export function computeRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return null
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

// Volume-weighted average price over the given candles (typically today's session).
export function computeVWAP(candles) {
  if (!candles || !candles.length) return null
  let sumPV = 0, sumV = 0
  for (const c of candles) {
    if (c.volume == null || c.close == null) continue
    const typicalPrice = c.high != null && c.low != null ? (c.high + c.low + c.close) / 3 : c.close
    sumPV += typicalPrice * c.volume
    sumV += c.volume
  }
  return sumV > 0 ? sumPV / sumV : null
}

// Gap % between today's open and yesterday's close.
export function computeGapPct(open, prevClose) {
  if (open == null || !prevClose) return null
  return ((open - prevClose) / prevClose) * 100
}
