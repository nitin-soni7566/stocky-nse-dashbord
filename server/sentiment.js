// Market Sentiment (Page 4) server endpoints:
//   GET /api/sentiment/index-quotes  — normalized index quotes from Upstox (15s cache)
//   GET /api/fii-data                — latest FII cash flow from NSE, accumulated over days
//
// Plus verifyIndexInstruments()/runHealthCheck() called on server startup.
import axios from 'axios'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPSTOX_BASE = 'https://api.upstox.com'
const token = () => process.env.UPSTOX_ACCESS_TOKEN

// Normalized name → Upstox instrument key. GIFT NIFTY is not available on Upstox
// (verified) so it is intentionally absent and surfaces as null to the client.
const INDEX_MAP = {
  nifty50:   'NSE_INDEX|Nifty 50',
  bankNifty: 'NSE_INDEX|Nifty Bank',
  indiaVix:  'NSE_INDEX|India VIX',
  sensex:    'BSE_INDEX|SENSEX',
  finNifty:  'NSE_INDEX|Nifty Fin Service'
}

async function fetchUpstoxQuote(keys) {
  const res = await axios.get(`${UPSTOX_BASE}/v2/market-quote/quotes`, {
    headers: { Authorization: `Bearer ${token()}`, Accept: 'application/json' },
    params: { instrument_key: keys.join(',') },
    timeout: 12000
  })
  // Re-key the response by instrument_token (= our instrument key).
  const byKey = {}
  for (const v of Object.values(res.data?.data ?? {})) {
    if (v?.instrument_token) byKey[v.instrument_token] = v
  }
  return byKey
}

function normalizeQuote(q) {
  if (!q || q.last_price == null) return null
  const price = q.last_price
  const change = q.net_change ?? 0
  const prevClose = +(price - change).toFixed(2)
  const changePct = prevClose ? +((change / prevClose) * 100).toFixed(2) : null
  return {
    price,
    change: +change.toFixed(2),
    changePct,
    open: q.ohlc?.open ?? null,
    high: q.ohlc?.high ?? null,
    low: q.ohlc?.low ?? null,
    prevClose
  }
}

// ─── /api/sentiment/index-quotes ────────────────────────────────────────────────
let quoteCache = null
let quoteCacheTime = 0
const QUOTE_TTL = 15000

async function getIndexQuotes() {
  const keys = Object.values(INDEX_MAP)
  const byKey = await fetchUpstoxQuote(keys)
  const out = {}
  for (const [name, key] of Object.entries(INDEX_MAP)) {
    out[name] = normalizeQuote(byKey[key])
  }
  out.giftNifty = null   // not available on Upstox
  return out
}

// ─── /api/fii-data ──────────────────────────────────────────────────────────────
const FII_STORE = resolve(__dirname, 'data/fii-history.json')
let fiiCache = null
let fiiCacheTime = 0
const FII_TTL = 5 * 60 * 1000

function readFiiStore() {
  try { return JSON.parse(readFileSync(FII_STORE, 'utf-8')) } catch { return [] }
}

async function getFiiData() {
  const res = await axios.get('https://www.nseindia.com/api/fiidiiTradeReact', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json',
      Referer: 'https://www.nseindia.com/reports-fii-dii'
    },
    timeout: 9000
  })
  const rows = Array.isArray(res.data) ? res.data : []
  const fii = rows.find(r => (r.category || '').toUpperCase().includes('FII'))
  if (!fii?.date) throw new Error('no FII row in NSE response')

  const net = parseFloat(fii.netValue) || 0
  const record = {
    date: fii.date,                                   // "01-Jul-2026"
    displayDate: String(parseInt(fii.date, 10) || fii.date.slice(0, 2)),
    buy: parseFloat(fii.buyValue) || 0,
    sell: parseFloat(fii.sellValue) || 0,
    net,
    type: net >= 0 ? 'buy' : 'sell'
  }

  // Accumulate: prepend today's record if it's a new trading day; keep last 15.
  const history = readFiiStore()
  if (!history.length || history[0].date !== record.date) history.unshift(record)
  else history[0] = record
  const trimmed = history.slice(0, 15)
  try { writeFileSync(FII_STORE, JSON.stringify(trimmed, null, 2)) } catch {}
  return trimmed.slice(0, 10)
}

// ─── Startup verification ───────────────────────────────────────────────────────
export async function verifyIndexInstruments() {
  const keysToTest = [...Object.values(INDEX_MAP), 'NSE_INDEX|Nifty Next 50', 'NSE_INDEX|GIFT NIFTY']
  try {
    const byKey = await fetchUpstoxQuote(keysToTest)
    const working = []
    keysToTest.forEach(key => {
      const v = byKey[key]
      if (v?.last_price != null) { console.log(`✅ ${key}: ₹${v.last_price}`); working.push(key) }
      else console.warn(`❌ ${key}: NO DATA — excluded`)
    })
    return working
  } catch (err) {
    console.error('❌ verifyIndexInstruments failed:', err.response?.status ?? err.message)
    return []
  }
}

export async function runHealthCheck() {
  console.log('=== SENTIMENT PAGE HEALTH CHECK ===')
  if (!token()) { console.error('❌ Upstox token missing — sentiment page will fail'); console.log('=== END HEALTH CHECK ==='); return }
  console.log('✅ Upstox token present')
  await verifyIndexInstruments()
  try {
    const fii = await getFiiData()
    console.log(`✅ FII data: ${fii.length} day(s), latest ${fii[0]?.date} net ${fii[0]?.net}Cr`)
  } catch (err) {
    console.warn('❌ FII data unavailable:', err.response?.status ?? err.message)
  }
  console.log('=== END HEALTH CHECK ===')
}

export function mountSentiment(app) {
  app.get('/api/sentiment/index-quotes', async (req, res) => {
    if (!token()) return res.status(503).json({ error: true, message: 'Upstox not configured' })
    if (quoteCache && Date.now() - quoteCacheTime < QUOTE_TTL) return res.json(quoteCache)
    try {
      const data = await getIndexQuotes()
      quoteCache = data
      quoteCacheTime = Date.now()
      res.json(data)
    } catch (err) {
      res.status(502).json({ error: true, message: err.response?.data?.errors?.[0]?.message ?? err.message, lastCached: quoteCache })
    }
  })

  app.get('/api/fii-data', async (req, res) => {
    if (fiiCache && Date.now() - fiiCacheTime < FII_TTL) return res.json(fiiCache)
    try {
      const data = await getFiiData()
      fiiCache = data
      fiiCacheTime = Date.now()
      res.json(data)
    } catch (err) {
      console.error('FII data fetch failed:', err.message)
      const stored = readFiiStore()
      if (stored.length) return res.json(stored.slice(0, 10))
      res.status(503).json({ error: true, message: 'FII data unavailable' })
    }
  })
}
