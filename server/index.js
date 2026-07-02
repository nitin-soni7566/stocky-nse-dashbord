import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { parse } from 'csv-parse/sync'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mountUpstox } from './upstox.js'
import { mountSentiment, runHealthCheck } from './sentiment.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json())

// ─── Upstox (REST proxy + WebSocket relay + SSE) ────────────────────────────────
mountUpstox(app)

// ─── Market Sentiment (Page 4) endpoints ────────────────────────────────────────
mountSentiment(app)

// ─── Market status ────────────────────────────────────────────────────────────
const NSE_HOLIDAYS_2025_2026 = [
  '2025-01-14', '2025-02-19', '2025-02-26', '2025-03-14',
  '2025-03-31', '2025-04-10', '2025-04-14', '2025-04-18',
  '2025-05-01', '2025-08-15', '2025-08-27', '2025-10-02',
  '2025-10-21', '2025-10-22', '2025-11-05', '2025-11-15',
  '2025-12-25',
  '2026-01-14', '2026-01-26', '2026-03-05', '2026-03-20',
  '2026-03-25', '2026-04-02', '2026-04-03', '2026-04-14',
  '2026-05-01', '2026-07-17', '2026-08-15', '2026-10-02',
  '2026-10-20', '2026-11-04', '2026-12-25'
]

function getISTDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
}

function getMarketStatus() {
  const now = getISTDate()
  const dayOfWeek = now.getDay()
  const dateStr = now.toISOString().split('T')[0]
  const totalMinutes = now.getHours() * 60 + now.getMinutes()

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const isHoliday = NSE_HOLIDAYS_2025_2026.includes(dateStr)
  const isPreOpen = totalMinutes >= 540 && totalMinutes < 555
  const isOpen = totalMinutes >= 555 && totalMinutes <= 930

  let session = 'closed'
  if (!isWeekend && !isHoliday) {
    if (isPreOpen) session = 'pre-open'
    else if (isOpen) session = 'open'
  }

  const nextOpenDate = new Date(now)
  if (totalMinutes >= 930 || isWeekend || isHoliday) {
    nextOpenDate.setDate(nextOpenDate.getDate() + 1)
    while (
      nextOpenDate.getDay() === 0 || nextOpenDate.getDay() === 6 ||
      NSE_HOLIDAYS_2025_2026.includes(nextOpenDate.toISOString().split('T')[0])
    ) nextOpenDate.setDate(nextOpenDate.getDate() + 1)
  }
  nextOpenDate.setHours(9, 15, 0, 0)
  const nextCloseDate = new Date(nextOpenDate)
  nextCloseDate.setHours(15, 30, 0, 0)

  return { isOpen: session === 'open', session, nextOpen: nextOpenDate.toISOString(), nextClose: nextCloseDate.toISOString() }
}

app.get('/api/market-status', (req, res) => res.json(getMarketStatus()))

// ─── NSE symbol refresh ───────────────────────────────────────────────────────
const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://www.nseindia.com/',
  'Connection': 'keep-alive'
}

async function fetchNSESymbols(url) {
  const response = await axios.get(url, { headers: NSE_HEADERS, timeout: 30000, responseType: 'text' })
  const records = parse(response.data, { columns: true, skip_empty_lines: true, trim: true })
  return records.map(row => ({
    symbol: row['Symbol']?.trim() || '',
    yahooSymbol: `${row['Symbol']?.trim()}.NS`,
    name: row['Company Name']?.trim() || '',
    sector: row['Industry']?.trim() || 'Unknown',
    isin: row['ISIN Code']?.trim() || '',
    series: row['Series']?.trim() || 'EQ'
  })).filter(r => r.symbol)
}

async function fetchFOSymbols(nifty500Lookup) {
  const res = await axios.get('https://images.dhan.co/api-data/api-scrip-master.csv', { timeout: 30000, responseType: 'text' })
  const records = parse(res.data, { columns: true, skip_empty_lines: true, trim: true })
  const lotMap = new Map()
  for (const r of records) {
    if (r.SEM_INSTRUMENT_NAME !== 'FUTSTK' || r.SEM_EXM_EXCH_ID !== 'NSE') continue
    const base = (r.SEM_TRADING_SYMBOL || '').split('-')[0].trim()
    if (!base || /^\d/.test(base) || base.includes('TEST')) continue
    if (!lotMap.has(base)) lotMap.set(base, parseFloat(r.SEM_LOT_UNITS) || null)
  }
  return [...lotMap.keys()].sort().map(sym => {
    const n500 = nifty500Lookup.get(sym)
    return { symbol: sym, yahooSymbol: `${sym}.NS`, name: n500?.name || sym, sector: n500?.sector || 'Unknown', isin: n500?.isin || '', series: 'EQ', lotSize: lotMap.get(sym) }
  })
}

app.post('/api/refresh-symbols', async (req, res) => {
  try {
    const [nifty200, nifty500] = await Promise.all([
      fetchNSESymbols('https://archives.nseindia.com/content/indices/ind_nifty200list.csv'),
      fetchNSESymbols('https://archives.nseindia.com/content/indices/ind_nifty500list.csv')
    ])
    writeFileSync(resolve(__dirname, '../src/data/nifty200.json'), JSON.stringify(nifty200, null, 2))
    writeFileSync(resolve(__dirname, '../src/data/nifty500.json'), JSON.stringify(nifty500, null, 2))

    const n500Lookup = new Map(nifty500.map(s => [s.symbol, s]))
    const niftyFO = await fetchFOSymbols(n500Lookup)
    writeFileSync(resolve(__dirname, '../src/data/niftyFO.json'), JSON.stringify(niftyFO, null, 2))

    res.json({ success: true, nifty200: nifty200.length, nifty500: nifty500.length, niftyFO: niftyFO.length, updatedAt: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── Startup ──────────────────────────────────────────────────────────────────
app.listen(3001, () => {
  console.log('Server running on http://localhost:3001')
  if (process.env.UPSTOX_ACCESS_TOKEN) {
    console.log('Upstox: configured — real-time WebSocket feed available')
    runHealthCheck().catch(err => console.error('Health check error:', err.message))
  } else {
    console.log('Upstox: not configured — add UPSTOX_ACCESS_TOKEN to .env')
  }
})
