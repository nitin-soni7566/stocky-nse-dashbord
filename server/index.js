import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { parse } from 'csv-parse/sync'
import { writeFileSync, readFileSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json())

// ─── Yahoo Finance proxy cache ────────────────────────────────────────────────
const cache = new Map()
const CACHE_TTL = 30000

let yahooCrumb = null
let yahooCookies = null
let crumbExpiry = 0

async function getYahooCrumb() {
  if (yahooCrumb && Date.now() < crumbExpiry) return yahooCrumb
  try {
    const homeRes = await axios.get('https://finance.yahoo.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000,
      maxRedirects: 5
    })
    yahooCookies = (homeRes.headers['set-cookie'] ?? []).map(c => c.split(';')[0]).join('; ')
    const crumbRes = await axios.get('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Cookie': yahooCookies
      },
      timeout: 10000
    })
    yahooCrumb = crumbRes.data
    crumbExpiry = Date.now() + 60 * 60 * 1000
    console.log('Yahoo crumb refreshed:', yahooCrumb)
    return yahooCrumb
  } catch (err) {
    console.error('Yahoo crumb error:', err.message)
    return null
  }
}

getYahooCrumb().catch(() => {})

// ─── Dhan: symbol map ─────────────────────────────────────────────────────────
const dhanSymbolMap = new Map()   // "SBIN" → 11536  (integer security ID)
let dhanMapReady = false
const DHAN_CACHE_PATH = resolve(__dirname, 'dhan-symbols.json')

async function loadDhanSymbolMap() {
  if (dhanMapReady) return

  // Use local cache if < 24 hours old
  try {
    const stat = statSync(DHAN_CACHE_PATH)
    if (Date.now() - stat.mtimeMs < 24 * 3600 * 1000) {
      const cached = JSON.parse(readFileSync(DHAN_CACHE_PATH, 'utf-8'))
      for (const [k, v] of Object.entries(cached)) dhanSymbolMap.set(k, v)
      dhanMapReady = true
      console.log(`Dhan: loaded ${dhanSymbolMap.size} symbols from cache`)
      return
    }
  } catch {}

  // Download fresh scrip master from Dhan
  try {
    console.log('Dhan: downloading scrip master...')
    const res = await axios.get(
      'https://images.dhan.co/api-data/api-scrip-master.csv',
      { timeout: 30000, responseType: 'text' }
    )
    const records = parse(res.data, { columns: true, skip_empty_lines: true, trim: true })
    const mapObj = {}
    for (const r of records) {
      if (
        r.SEM_EXM_EXCH_ID === 'NSE' &&
        r.SEM_INSTRUMENT_NAME === 'EQUITY' &&
        r.SEM_SERIES === 'EQ' &&
        r.SEM_TRADING_SYMBOL &&
        r.SEM_SMST_SECURITY_ID
      ) {
        const sym = r.SEM_TRADING_SYMBOL.trim()
        const id = parseInt(r.SEM_SMST_SECURITY_ID)
        if (sym && !isNaN(id)) {
          dhanSymbolMap.set(sym, id)
          mapObj[sym] = id
        }
      }
    }
    writeFileSync(DHAN_CACHE_PATH, JSON.stringify(mapObj))
    dhanMapReady = true
    console.log(`Dhan: loaded ${dhanSymbolMap.size} NSE equity symbols`)
  } catch (err) {
    console.error('Dhan scrip master error:', err.message)
  }
}

// ─── Dhan: status ─────────────────────────────────────────────────────────────
app.get('/api/dhan/status', (req, res) => {
  const configured = !!(process.env.DHAN_ACCESS_TOKEN && process.env.DHAN_CLIENT_ID)
  res.json({ configured, symbolMapReady: dhanMapReady })
})

// ─── Dhan: real-time quotes ───────────────────────────────────────────────────
app.get('/api/dhan/quotes', async (req, res) => {
  const { symbols } = req.query
  if (!symbols) return res.status(400).json({ error: 'symbols param required' })

  if (!dhanMapReady) await loadDhanSymbolMap()

  const { DHAN_ACCESS_TOKEN, DHAN_CLIENT_ID } = process.env
  if (!DHAN_ACCESS_TOKEN) return res.status(503).json({ error: 'Dhan not configured — add credentials to .env' })

  // Map Yahoo-format symbols (SBIN.NS) → Dhan security IDs
  const symList = symbols.split(',').map(s => s.trim().replace(/\.NS$/i, '').toUpperCase())
  const secIds = []
  const idToSymbol = new Map()

  for (const sym of symList) {
    const id = dhanSymbolMap.get(sym)
    if (id != null) {
      secIds.push(id)
      idToSymbol.set(String(id), sym)
    }
  }

  if (secIds.length === 0) return res.json({})

  const result = {}
  const BATCH = 500

  for (let i = 0; i < secIds.length; i += BATCH) {
    const batch = secIds.slice(i, i + BATCH)
    try {
      const quoteRes = await axios.post(
        'https://api.dhan.co/v2/marketfeed/quote',
        { NSE_EQ: batch },
        {
          headers: {
            'access-token': DHAN_ACCESS_TOKEN,
            'client-id': DHAN_CLIENT_ID ?? '',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      )

      // Response can be { NSE_EQ: {...} } or { data: { NSE_EQ: {...} } }
      const nseData = quoteRes.data?.data?.NSE_EQ ?? quoteRes.data?.NSE_EQ ?? {}

      for (const [idStr, q] of Object.entries(nseData)) {
        const sym = idToSymbol.get(idStr)
        if (!sym || !q) continue
        const ltp = parseFloat(q.last_price) || null
        const prevClose = parseFloat(q.close) || null
        const change = ltp != null && prevClose != null ? parseFloat((ltp - prevClose).toFixed(2)) : null
        const changePct = change != null && prevClose ? parseFloat(((change / prevClose) * 100).toFixed(4)) : null
        result[sym + '.NS'] = {
          price:     ltp,
          change,
          changePct,
          high:      parseFloat(q.high)    || null,
          low:       parseFloat(q.low)     || null,
          volume:    parseInt(q.volume)    || null,
          open:      parseFloat(q.open)    || null,
          prevClose
        }
      }
    } catch (err) {
      console.error('Dhan quote error:', err.response?.status, err.message)
    }
  }

  res.json(result)
})

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

// ─── Yahoo Finance proxy ──────────────────────────────────────────────────────
app.get('/api/proxy', async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'url param required' })

  const cached = cache.get(url)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return res.json(cached.data)

  await new Promise(r => setTimeout(r, 200))

  try {
    const crumb = await getYahooCrumb()
    let fetchUrl = url
    if (url.includes('finance.yahoo.com') && crumb) {
      fetchUrl += (url.includes('?') ? '&' : '?') + `crumb=${encodeURIComponent(crumb)}`
    }
    const response = await axios.get(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': yahooCookies ?? '',
        'Referer': 'https://finance.yahoo.com/'
      },
      timeout: 15000
    })
    cache.set(url, { data: response.data, ts: Date.now() })
    res.json(response.data)
  } catch (err) {
    if (err.response?.status === 401) { crumbExpiry = 0; yahooCrumb = null }
    res.status(err.response?.status ?? 500).json({ error: err.message })
  }
})

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
  if (process.env.DHAN_ACCESS_TOKEN) {
    loadDhanSymbolMap().catch(() => {})
  } else {
    console.log('Dhan: not configured — add DHAN_ACCESS_TOKEN to .env for real-time data')
  }
})
