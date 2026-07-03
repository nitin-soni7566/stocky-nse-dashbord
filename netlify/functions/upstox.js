// Upstox REST proxy for production (Netlify). Serverless → no persistent WebSocket,
// so /status reports streaming:false and the client falls back to REST polling.
// Handles:  /api/upstox/status   and   /api/upstox/rest/<upstox-path>
const UPSTOX_BASE = 'https://api.upstox.com'
const ALLOWED_PREFIXES = ['/v2/market-quote/', '/v3/historical-candle/']
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

exports.handler = async (event) => {
  const token = process.env.UPSTOX_ACCESS_TOKEN
  const marker = '/upstox/'
  const idx = event.path.indexOf(marker)
  const rest = idx >= 0 ? event.path.slice(idx + marker.length) : ''

  if (rest === 'status') {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ configured: !!token, streaming: false }) }
  }

  if (!rest.startsWith('rest/')) {
    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'not found' }) }
  }
  if (!token) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'Upstox not configured' }) }
  }

  let upstoxPath = '/' + rest.slice('rest/'.length)
  if (!ALLOWED_PREFIXES.some(p => upstoxPath.startsWith(p))) {
    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'path not allowed' }) }
  }

  // Netlify may percent-decode event.path / query. Index instrument keys contain
  // "|" and spaces (e.g. "NSE_INDEX|Nifty 50"), so re-encode reserved chars to keep
  // the upstream URL valid. Rebuilding the query from queryStringParameters (which
  // are decoded) guarantees correct encoding regardless of Netlify's behaviour.
  upstoxPath = upstoxPath.split('/').map(seg => seg.replace(/\|/g, '%7C').replace(/ /g, '%20')).join('/')

  const qsp = event.queryStringParameters || {}
  const query = Object.keys(qsp).length
    ? Object.entries(qsp).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    : (event.rawQuery || '')

  const target = UPSTOX_BASE + upstoxPath + (query ? `?${query}` : '')
  try {
    const res = await fetch(target, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    const body = await res.text()
    return { statusCode: res.status, headers: CORS, body }
  } catch (err) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: err.message }) }
  }
}
