// Maps our internal symbols <-> Upstox instrument keys.
//   Equities: yahooSymbol "RELIANCE.NS"  <->  "NSE_EQ|<ISIN>"   (ISIN comes from the JSON)
//   Indices:  "^NSEI" (etc.)             <->  "NSE_INDEX|<name>" (hardcoded, verified live)
import nifty200 from '../data/nifty200.json'
import nifty500 from '../data/nifty500.json'
import niftyFO from '../data/niftyFO.json'

// ^symbol -> Upstox index instrument key. Verified against the live Upstox API.
export const INDEX_KEY_MAP = {
  '^NSEI':              'NSE_INDEX|Nifty 50',
  '^NSEBANK':           'NSE_INDEX|Nifty Bank',
  '^CNXAUTO':           'NSE_INDEX|Nifty Auto',
  '^CNXFMCG':           'NSE_INDEX|Nifty FMCG',
  '^CNXPHARMA':         'NSE_INDEX|Nifty Pharma',
  '^CNXIT':             'NSE_INDEX|Nifty IT',
  '^CNXREALTY':         'NSE_INDEX|Nifty Realty',
  '^CNXINFRA':          'NSE_INDEX|Nifty Infra',
  '^CNXENERGY':         'NSE_INDEX|Nifty Energy',
  '^CNXMETAL':          'NSE_INDEX|Nifty Metal',
  '^CNXMEDIA':          'NSE_INDEX|Nifty Media',
  '^CNXPSUBANK':        'NSE_INDEX|Nifty PSU Bank',
  '^CNXPVTBANK':        'NSE_INDEX|Nifty Pvt Bank',
  '^NIFTY_FIN_SERVICE': 'NSE_INDEX|Nifty Fin Service',
  '^CNXFIN':            'NSE_INDEX|Nifty FinSrv25 50',
  '^CNX100':            'NSE_INDEX|Nifty 100',
  '^CNX500':            'NSE_INDEX|Nifty 500'
}

// Build the equity maps once from the union of all symbol lists (deduped by yahooSymbol).
const _symToKey = new Map()   // "RELIANCE.NS" -> "NSE_EQ|INE002A01018"
const _keyToSym = new Map()   // reverse

for (const list of [nifty200, nifty500, niftyFO]) {
  for (const s of list) {
    if (!s.yahooSymbol || !s.isin) continue
    if (_symToKey.has(s.yahooSymbol)) continue
    const key = `NSE_EQ|${s.isin}`
    _symToKey.set(s.yahooSymbol, key)
    _keyToSym.set(key, s.yahooSymbol)
  }
}

for (const [sym, key] of Object.entries(INDEX_KEY_MAP)) {
  _symToKey.set(sym, key)
  _keyToSym.set(key, sym)
}

// Accepts a yahooSymbol ("RELIANCE.NS" / "RELIANCE") or an index symbol ("^NSEI").
export function toInstrumentKey(symbol) {
  if (!symbol) return null
  if (symbol.startsWith('^')) return INDEX_KEY_MAP[symbol] ?? null
  const yahoo = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`
  return _symToKey.get(yahoo) ?? null
}

// Instrument key -> our symbol ("RELIANCE.NS" or "^NSEI").
export function fromInstrumentKey(key) {
  return _keyToSym.get(key) ?? null
}
