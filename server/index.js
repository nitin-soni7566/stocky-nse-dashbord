import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { parse } from 'csv-parse/sync'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json())

const cache = new Map()
const CACHE_TTL = 30000

// Yahoo Finance crumb state
let yahooCrumb = null
let yahooCookies = null
let crumbExpiry = 0

async function getYahooCrumb() {
  if (yahooCrumb && Date.now() < crumbExpiry) return yahooCrumb
  try {
    // Step 1: get cookies from Yahoo Finance
    const homeRes = await axios.get('https://finance.yahoo.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000,
      maxRedirects: 5
    })
    const setCookieHeaders = homeRes.headers['set-cookie'] ?? []
    yahooCookies = setCookieHeaders.map(c => c.split(';')[0]).join('; ')

    // Step 2: get crumb
    const crumbRes = await axios.get('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Cookie': yahooCookies
      },
      timeout: 10000
    })
    yahooCrumb = crumbRes.data
    crumbExpiry = Date.now() + 60 * 60 * 1000  // 1 hour
    console.log('Yahoo crumb refreshed:', yahooCrumb)
    return yahooCrumb
  } catch (err) {
    console.error('Failed to get Yahoo crumb:', err.message)
    return null
  }
}

// Initialize crumb on startup
getYahooCrumb().catch(() => {})

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
  const h = now.getHours(), m = now.getMinutes()
  const totalMinutes = h * 60 + m

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const isHoliday = NSE_HOLIDAYS_2025_2026.includes(dateStr)
  const isPreOpen = totalMinutes >= 9 * 60 && totalMinutes < 9 * 60 + 15
  const isOpen = totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 30

  let session = 'closed'
  if (!isWeekend && !isHoliday) {
    if (isPreOpen) session = 'pre-open'
    else if (isOpen) session = 'open'
  }

  const nextOpenDate = new Date(now)
  if (totalMinutes >= 15 * 60 + 30 || isWeekend || isHoliday) {
    nextOpenDate.setDate(nextOpenDate.getDate() + 1)
    while (nextOpenDate.getDay() === 0 || nextOpenDate.getDay() === 6 ||
           NSE_HOLIDAYS_2025_2026.includes(nextOpenDate.toISOString().split('T')[0])) {
      nextOpenDate.setDate(nextOpenDate.getDate() + 1)
    }
  }
  nextOpenDate.setHours(9, 15, 0, 0)
  const nextCloseDate = new Date(nextOpenDate)
  nextCloseDate.setHours(15, 30, 0, 0)

  return { isOpen: session === 'open', session, nextOpen: nextOpenDate.toISOString(), nextClose: nextCloseDate.toISOString() }
}

app.get('/api/market-status', (req, res) => res.json(getMarketStatus()))

app.get('/api/proxy', async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'url param required' })

  const cached = cache.get(url)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return res.json(cached.data)

  await new Promise(r => setTimeout(r, 200))

  try {
    const crumb = await getYahooCrumb()
    // Append crumb to URL if Yahoo Finance URL
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
    const data = response.data
    cache.set(url, { data, ts: Date.now() })
    res.json(data)
  } catch (err) {
    console.error('Proxy error:', err.message, 'status:', err.response?.status)
    // If 401, try refreshing crumb
    if (err.response?.status === 401) {
      crumbExpiry = 0
      yahooCrumb = null
    }
    res.status(err.response?.status ?? 500).json({ error: err.message })
  }
})

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

app.post('/api/refresh-symbols', async (req, res) => {
  try {
    const [nifty200, nifty500] = await Promise.all([
      fetchNSESymbols('https://archives.nseindia.com/content/indices/ind_nifty200list.csv'),
      fetchNSESymbols('https://archives.nseindia.com/content/indices/ind_nifty500list.csv')
    ])
    writeFileSync(resolve(__dirname, '../src/data/nifty200.json'), JSON.stringify(nifty200, null, 2))
    writeFileSync(resolve(__dirname, '../src/data/nifty500.json'), JSON.stringify(nifty500, null, 2))
    res.json({ success: true, nifty200: nifty200.length, nifty500: nifty500.length, updatedAt: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.listen(3001, () => console.log('Server running on http://localhost:3001'))
