const PROXY = '/api/proxy'

async function proxyFetch(url) {
  try {
    const res = await fetch(`${PROXY}?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export async function fetchBulkQuotes(symbolsArray) {
  const results = {}
  const BATCH_SIZE = 20
  const FIELDS = 'regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,regularMarketOpen,regularMarketPreviousClose'

  for (let i = 0; i < symbolsArray.length; i += BATCH_SIZE) {
    const batch = symbolsArray.slice(i, i + BATCH_SIZE)
    const symbols = batch.map(s => (s.endsWith('.NS') || s.startsWith('^') ? s : `${s}.NS`)).join(',')
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=${FIELDS}`
    const data = await proxyFetch(url)

    if (data?.quoteResponse?.result) {
      for (const q of data.quoteResponse.result) {
        results[q.symbol] = {
          price: q.regularMarketPrice ?? null,
          change: q.regularMarketChange ?? null,
          changePct: q.regularMarketChangePercent ?? null,
          high: q.regularMarketDayHigh ?? null,
          low: q.regularMarketDayLow ?? null,
          volume: q.regularMarketVolume ?? null,
          open: q.regularMarketOpen ?? null,
          prevClose: q.regularMarketPreviousClose ?? null
        }
      }
    }

    if (i + BATCH_SIZE < symbolsArray.length) {
      await delay(300)
    }
  }

  return results
}

export async function fetchOHLCHistory(symbol, days = 5) {
  const sym = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=${days}d`
  const data = await proxyFetch(url)

  if (!data?.chart?.result?.[0]) return null

  const result = data.chart.result[0]
  const timestamps = result.timestamp ?? []
  const ohlcv = result.indicators?.quote?.[0] ?? {}

  return timestamps.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().split('T')[0],
    open: ohlcv.open?.[i] ?? null,
    high: ohlcv.high?.[i] ?? null,
    low: ohlcv.low?.[i] ?? null,
    close: ohlcv.close?.[i] ?? null,
    volume: ohlcv.volume?.[i] ?? null
  })).filter(c => c.close != null)
}

export async function fetchIntradayCandles(symbol) {
  const sym = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1m&range=1d`
  const data = await proxyFetch(url)

  if (!data?.chart?.result?.[0]) return null

  const result = data.chart.result[0]
  const timestamps = result.timestamp ?? []
  const ohlcv = result.indicators?.quote?.[0] ?? {}

  const candles = timestamps.map((ts, i) => {
    const istDate = new Date(ts * 1000 + 5.5 * 60 * 60 * 1000)
    return {
      timestamp: ts,
      istTime: `${String(istDate.getUTCHours()).padStart(2, '0')}:${String(istDate.getUTCMinutes()).padStart(2, '0')}`,
      open: ohlcv.open?.[i] ?? null,
      high: ohlcv.high?.[i] ?? null,
      low: ohlcv.low?.[i] ?? null,
      close: ohlcv.close?.[i] ?? null,
      volume: ohlcv.volume?.[i] ?? null
    }
  }).filter(c => c.close != null)

  return candles
}

export function get915Candle(candles, istTime = '09:15') {
  if (!candles?.length) return null
  return candles.find(c => c.istTime === istTime) ?? candles[0] ?? null
}
