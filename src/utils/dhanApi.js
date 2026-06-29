let _statusCache = null
let _statusExpiry = 0
let _dhanDisabled = false  // set true on 401 so we stop hammering a bad token

export async function getDhanStatus() {
  if (_dhanDisabled) return { configured: false, symbolMapReady: false }
  if (_statusCache && Date.now() < _statusExpiry) return _statusCache
  try {
    const res = await fetch('/api/dhan/status')
    _statusCache = await res.json()
    _statusExpiry = Date.now() + 30_000
    return _statusCache
  } catch {
    return { configured: false, symbolMapReady: false }
  }
}

export async function fetchDhanQuotes(yahooSymbols) {
  if (_dhanDisabled) return {}
  const nseSymbols = yahooSymbols.filter(s => typeof s === 'string' && s.endsWith('.NS'))
  if (!nseSymbols.length) return {}
  try {
    const res = await fetch(`/api/dhan/quotes?symbols=${encodeURIComponent(nseSymbols.join(','))}`)
    if (res.status === 401) {
      _dhanDisabled = true   // token expired — fall back to Yahoo for this session
      _statusCache = { configured: false, symbolMapReady: false }
      return {}
    }
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}
