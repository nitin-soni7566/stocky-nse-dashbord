import axios from 'axios'
import { parse } from 'csv-parse/sync'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://www.nseindia.com/',
  'Connection': 'keep-alive'
}

const INDICES = [
  {
    name: 'Nifty 200',
    url: 'https://archives.nseindia.com/content/indices/ind_nifty200list.csv',
    outputFile: resolve(__dirname, '../src/data/nifty200.json')
  },
  {
    name: 'Nifty 500',
    url: 'https://archives.nseindia.com/content/indices/ind_nifty500list.csv',
    outputFile: resolve(__dirname, '../src/data/nifty500.json')
  }
]

async function fetchCSV(url) {
  const response = await axios.get(url, {
    headers: NSE_HEADERS,
    timeout: 30000,
    responseType: 'text'
  })
  return response.data
}

function parseCSV(csvText) {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })
  return records.map(row => ({
    symbol: row['Symbol']?.trim() || '',
    yahooSymbol: `${row['Symbol']?.trim()}.NS`,
    name: row['Company Name']?.trim() || '',
    sector: row['Industry']?.trim() || 'Unknown',
    isin: row['ISIN Code']?.trim() || '',
    series: row['Series']?.trim() || 'EQ'
  })).filter(r => r.symbol)
}

async function fetchAndSave(index) {
  try {
    console.log(`Fetching ${index.name}...`)
    const csv = await fetchCSV(index.url)
    const symbols = parseCSV(csv)
    writeFileSync(index.outputFile, JSON.stringify(symbols, null, 2), 'utf-8')
    console.log(`✅ ${index.name}: ${symbols.length} symbols saved`)
    return symbols.length
  } catch (err) {
    console.error(`❌ Failed to fetch ${index.name}: ${err.message}`)
    if (existsSync(index.outputFile)) {
      const existing = JSON.parse(readFileSync(index.outputFile, 'utf-8'))
      console.log(`   Keeping existing file with ${existing.length} symbols`)
    }
    return null
  }
}

async function main() {
  console.log('Fetching NSE symbol lists...\n')
  const results = await Promise.all(INDICES.map(fetchAndSave))
  const [n200, n500] = results
  if (n200 && n500) {
    console.log(`\n✅ Nifty 200: ${n200} symbols saved | Nifty 500: ${n500} symbols saved`)
  }
}

main()
