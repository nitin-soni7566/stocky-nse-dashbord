// Shared NSE/Dhan symbol-fetch logic used by both the CLI script (fetchSymbols.js)
// and the dev-only /api/refresh-symbols route (server/index.js).
import axios from 'axios'
import { parse } from 'csv-parse/sync'

const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://www.nseindia.com/',
  'Connection': 'keep-alive'
}

export const NIFTY_TOTAL_MARKET_URL = 'https://archives.nseindia.com/content/indices/ind_niftytotalmarket_list.csv'
export const DHAN_SCRIP_MASTER_URL = 'https://images.dhan.co/api-data/api-scrip-master.csv'

export async function fetchNSESymbols(url) {
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

// F&O-eligible NSE stocks via Dhan's scrip master CSV (NSE's own fo_mktlots.csv is now PDF-only).
// universeLookup: Map<symbol, {name, sector, isin}> used to enrich F&O entries with metadata.
export async function fetchFOSymbols(universeLookup) {
  const res = await axios.get(DHAN_SCRIP_MASTER_URL, { timeout: 30000, responseType: 'text' })
  const records = parse(res.data, { columns: true, skip_empty_lines: true, trim: true })
  const lotMap = new Map()
  for (const r of records) {
    if (r.SEM_INSTRUMENT_NAME !== 'FUTSTK' || r.SEM_EXM_EXCH_ID !== 'NSE') continue
    const base = (r.SEM_TRADING_SYMBOL || '').split('-')[0].trim()
    if (!base || /^\d/.test(base) || base.includes('TEST') || base.includes('NSETEST')) continue
    if (!lotMap.has(base)) lotMap.set(base, parseFloat(r.SEM_LOT_UNITS) || null)
  }
  return [...lotMap.keys()].sort().map(sym => {
    const u = universeLookup.get(sym)
    return {
      symbol: sym,
      yahooSymbol: `${sym}.NS`,
      name: u?.name || sym,
      sector: u?.sector || 'Unknown',
      isin: u?.isin || '',
      series: 'EQ',
      lotSize: lotMap.get(sym)
    }
  })
}
