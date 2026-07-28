import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mountUpstox } from './upstox.js'
import { mountSentiment, runHealthCheck } from './sentiment.js'
import { fetchNSESymbols, fetchFOSymbols, NIFTY_TOTAL_MARKET_URL } from '../scripts/symbolSources.js'

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
app.post('/api/refresh-symbols', async (req, res) => {
  try {
    const universe = await fetchNSESymbols(NIFTY_TOTAL_MARKET_URL)
    writeFileSync(resolve(__dirname, '../src/data/niftyUniverse.json'), JSON.stringify(universe, null, 2))

    const universeLookup = new Map(universe.map(s => [s.symbol, s]))
    const niftyFO = await fetchFOSymbols(universeLookup)
    writeFileSync(resolve(__dirname, '../src/data/niftyFO.json'), JSON.stringify(niftyFO, null, 2))

    res.json({ success: true, universe: universe.length, niftyFO: niftyFO.length, updatedAt: new Date().toISOString() })
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
