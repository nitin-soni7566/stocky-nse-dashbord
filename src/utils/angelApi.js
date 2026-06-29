let _statusCache = null
let _statusExpiry = 0

export async function getAngelStatus() {
  if (_statusCache && Date.now() < _statusExpiry) return _statusCache
  try {
    const res = await fetch('/api/angel/status')
    _statusCache = await res.json()
    _statusExpiry = Date.now() + 30_000
    return _statusCache
  } catch {
    return { configured: false, active: false, symbolMapReady: false }
  }
}

export function invalidateAngelStatusCache() {
  _statusExpiry = 0
}

export async function fetchAngelQuotes(yahooSymbols) {
  const nseSymbols = yahooSymbols.filter(s => typeof s === 'string' && s.endsWith('.NS'))
  if (!nseSymbols.length) return {}
  try {
    const res = await fetch(`/api/angel/quotes?symbols=${encodeURIComponent(nseSymbols.join(','))}`)
    if (res.status === 401) {
      invalidateAngelStatusCache()
      return {}
    }
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}
