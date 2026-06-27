export function isDoji(candle) {
  if (!candle) return false
  const bodySize = Math.abs(candle.open - candle.close)
  const totalRange = candle.high - candle.low
  if (totalRange === 0) return false
  return bodySize / totalRange < 0.1
}

export function getDojiStrength(candle) {
  if (!candle) return null
  const bodySize = Math.abs(candle.open - candle.close)
  const totalRange = candle.high - candle.low
  if (totalRange === 0) return null
  return ((bodySize / totalRange) * 100).toFixed(2)
}

export function isBreakout(currentPrice, nifteenCandle) {
  if (!nifteenCandle || currentPrice == null) return false
  return currentPrice > nifteenCandle.high
}

export function getBreakoutPct(currentPrice, nifteenCandle) {
  if (!nifteenCandle || currentPrice == null) return null
  return (((currentPrice - nifteenCandle.high) / nifteenCandle.high) * 100).toFixed(2)
}
