// Upstox data layer. Drop-in replacement for the old yahooApi.js — same exported
// function names/shapes so the hooks only change their import path.
//
// All REST goes through the server proxy at /api/upstox/rest/<upstox-path>, which
// injects the Bearer token (never exposed to the browser). Live ticks come over SSE
// from /api/upstox/stream (dev only); getUpstoxStatus() reports whether that's available.
import { toInstrumentKey, fromInstrumentKey } from './instruments.js'

const REST = '/api/upstox/rest'
const QUOTE_BATCH = 500   // Upstox market-quote/quotes hard limit

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function upstoxGet(path) {
  try {
    const res = await fetch(REST + path)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// YYYY-MM-DD in IST, offset by whole days.
function istDateStr(offsetDays = 0) {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

// Raw full-quote fetch for a set of instrument keys → map keyed by instrument_token.
async function fullQuotes(keys) {
  const out = {}
  for (let i = 0; i < keys.length; i += QUOTE_BATCH) {
    const batch = keys.slice(i, i + QUOTE_BATCH)
    const path = `/v2/market-quote/quotes?instrument_key=${encodeURIComponent(batch.join(','))}`
    const data = await upstoxGet(path)
    const entries = data?.data ?? {}
    for (const q of Object.values(entries)) {
      if (q?.instrument_token) out[q.instrument_token] = q
    }
    if (i + QUOTE_BATCH < keys.length) await delay(250)
  }
  return out
}

function toQuote(q) {
  const price = q.last_price ?? null
  const change = q.net_change ?? null
  const prevClose = price != null && change != null ? +(price - change).toFixed(2) : null
  const changePct = change != null && prevClose ? +((change / prevClose) * 100).toFixed(4) : null
  return {
    price,
    change,
    changePct,
    high: q.ohlc?.high ?? null,
    low: q.ohlc?.low ?? null,
    volume: q.volume ?? null,
    open: q.ohlc?.open ?? null,
    prevClose
  }
}

// symbols: array of our symbols ("RELIANCE.NS" or "^NSEI"). Returns map keyed by symbol.
export async function fetchBulkQuotes(symbols) {
  const keys = []
  const keyToSym = new Map()
  for (const s of symbols) {
    const k = toInstrumentKey(s)
    if (k && !keyToSym.has(k)) {
      keys.push(k)
      keyToSym.set(k, s)
    }
  }
  if (!keys.length) return {}

  const raw = await fullQuotes(keys)
  const results = {}
  for (const [key, q] of Object.entries(raw)) {
    const sym = keyToSym.get(key) ?? fromInstrumentKey(key)
    if (sym) results[sym] = toQuote(q)
  }
  return results
}

// Daily OHLC history, oldest→newest, with today's live candle appended (Upstox
// historical excludes the current day). `days` counts total candles incl. today.
export async function fetchOHLCHistory(symbol, days = 5) {
  const key = toInstrumentKey(symbol)
  if (!key) return null

  const to = istDateStr(0)
  const from = istDateStr(-(days * 2 + 6))   // widen for weekends/holidays
  const path = `/v3/historical-candle/${encodeURIComponent(key)}/days/1/${to}/${from}`
  const data = await upstoxGet(path)
  const raw = data?.data?.candles ?? []

  // Upstox candles: [isoTs, open, high, low, close, volume, oi], newest-first.
  const past = raw
    .map(c => ({ date: c[0].slice(0, 10), open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5] }))
    .filter(c => c.close != null)
    .reverse()
    .slice(-(days - 1))

  // Append today from a live quote (has today's volume + ltp).
  const quoteRaw = await fullQuotes([key])
  const q = quoteRaw[key]
  const history = [...past]
  if (q?.last_price != null) {
    history.push({
      date: to,
      open: q.ohlc?.open ?? null,
      high: q.ohlc?.high ?? null,
      low: q.ohlc?.low ?? null,
      close: q.last_price,
      volume: q.volume ?? null
    })
  }
  return history.length ? history : null
}

// Today's 1-minute intraday candles, oldest→newest, with an istTime "HH:MM" per candle.
export async function fetchIntradayCandles(symbol) {
  const key = toInstrumentKey(symbol)
  if (!key) return null

  const path = `/v3/historical-candle/intraday/${encodeURIComponent(key)}/minutes/1`
  const data = await upstoxGet(path)
  const raw = data?.data?.candles ?? []

  return raw
    .map(c => ({
      timestamp: c[0],
      istTime: c[0].slice(11, 16),   // "2026-07-02T09:15:00+05:30" → "09:15"
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
      volume: c[5]
    }))
    .filter(c => c.close != null)
    .reverse()
}

export function get915Candle(candles, istTime = '09:15') {
  if (!candles?.length) return null
  return candles.find(c => c.istTime === istTime) ?? candles[0] ?? null
}

// ─── Live streaming (dev / self-hosted only) ────────────────────────────────────
export async function getUpstoxStatus() {
  try {
    const res = await fetch('/api/upstox/status')
    if (!res.ok) return { configured: false, streaming: false }
    return await res.json()
  } catch {
    return { configured: false, streaming: false }
  }
}

// Subscribe to live ticks for `symbols`. Calls onQuotes(mapKeyedBySymbol) on each push.
// Returns an unsubscribe function.
export function subscribeQuotes(symbols, onQuotes) {
  const keys = []
  const keyToSym = new Map()
  for (const s of symbols) {
    const k = toInstrumentKey(s)
    if (k && !keyToSym.has(k)) {
      keys.push(k)
      keyToSym.set(k, s)
    }
  }

  fetch('/api/upstox/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys })
  }).catch(() => {})

  const es = new EventSource('/api/upstox/stream')
  es.onmessage = e => {
    let payload
    try { payload = JSON.parse(e.data) } catch { return }
    const out = {}
    for (const [key, t] of Object.entries(payload)) {
      const sym = keyToSym.get(key) ?? fromInstrumentKey(key)
      if (!sym) continue
      const price = t.ltp ?? null
      const prevClose = t.cp ?? null
      const change = price != null && prevClose != null ? +(price - prevClose).toFixed(2) : null
      const changePct = change != null && prevClose ? +((change / prevClose) * 100).toFixed(4) : null
      out[sym] = {
        price, change, changePct,
        high: t.high ?? null, low: t.low ?? null,
        volume: t.vol ?? null, open: t.open ?? null, prevClose
      }
    }
    if (Object.keys(out).length) onQuotes(out)
  }
  return () => es.close()
}
