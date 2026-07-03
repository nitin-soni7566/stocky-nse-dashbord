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

async function fetchCSV(url, extraHeaders = {}) {
  const response = await axios.get(url, {
    headers: { ...NSE_HEADERS, ...extraHeaders },
    timeout: 30000,
    responseType: 'text'
  })
  return response.data
}

function parseIndexCSV(csvText) {
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

// Uses Dhan scrip master CSV (reliable public source) to find F&O eligible NSE stocks
async function fetchFOFromDhan(nifty500Lookup) {
  const csvText = await fetchCSV('https://images.dhan.co/api-data/api-scrip-master.csv', {})
  const records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true })

  const lotMap = new Map()
  for (const r of records) {
    if (r.SEM_INSTRUMENT_NAME !== 'FUTSTK' || r.SEM_EXM_EXCH_ID !== 'NSE') continue
    const base = (r.SEM_TRADING_SYMBOL || '').split('-')[0].trim()
    if (!base || /^\d/.test(base) || base.includes('TEST') || base.includes('NSETEST')) continue
    if (!lotMap.has(base)) lotMap.set(base, parseFloat(r.SEM_LOT_UNITS) || null)
  }

  return [...lotMap.keys()].sort().map(sym => {
    const n500 = nifty500Lookup.get(sym)
    return {
      symbol: sym,
      yahooSymbol: `${sym}.NS`,
      name: n500?.name || sym,
      sector: n500?.sector || 'Unknown',
      isin: n500?.isin || '',
      series: 'EQ',
      lotSize: lotMap.get(sym)
    }
  })
}

async function fetchAndSaveIndex(name, url, outputFile) {
  try {
    console.log(`Fetching ${name}...`)
    const csv = await fetchCSV(url)
    const symbols = parseIndexCSV(csv)
    writeFileSync(outputFile, JSON.stringify(symbols, null, 2), 'utf-8')
    console.log(`✅ ${name}: ${symbols.length} symbols saved`)
    return symbols
  } catch (err) {
    console.error(`❌ Failed to fetch ${name}: ${err.message}`)
    if (existsSync(outputFile)) {
      const existing = JSON.parse(readFileSync(outputFile, 'utf-8'))
      console.log(`   Keeping existing file with ${existing.length} symbols`)
      return existing
    }
    return []
  }
}

async function main() {
  console.log('Fetching NSE symbol lists...\n')

  const nifty200 = await fetchAndSaveIndex(
    'Nifty 200',
    'https://archives.nseindia.com/content/indices/ind_nifty200list.csv',
    resolve(__dirname, '../src/data/nifty200.json')
  )

  const nifty500 = await fetchAndSaveIndex(
    'Nifty 500',
    'https://archives.nseindia.com/content/indices/ind_nifty500list.csv',
    resolve(__dirname, '../src/data/nifty500.json')
  )

  await fetchAndSaveIndex(
    'Nifty Total Market (750)',
    'https://archives.nseindia.com/content/indices/ind_niftytotalmarket_list.csv',
    resolve(__dirname, '../src/data/nifty750.json')
  )

  // F&O stocks via Dhan scrip master (NSE changed fo_mktlots.csv to PDF)
  const foOutputFile = resolve(__dirname, '../src/data/niftyFO.json')
  try {
    console.log('Fetching F&O list from Dhan scrip master...')
    const n500Lookup = new Map(nifty500.map(s => [s.symbol, s]))
    const foSymbols = await fetchFOFromDhan(n500Lookup)
    writeFileSync(foOutputFile, JSON.stringify(foSymbols, null, 2), 'utf-8')
    console.log(`✅ F&O: ${foSymbols.length} symbols saved`)
  } catch (err) {
    console.error(`❌ Failed to fetch F&O list: ${err.message}`)
    if (!existsSync(foOutputFile)) writeFileSync(foOutputFile, '[]', 'utf-8')
  }
}

main()
