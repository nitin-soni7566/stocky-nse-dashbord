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

  const upstoxPath = '/' + rest.slice('rest/'.length)
  if (!ALLOWED_PREFIXES.some(p => upstoxPath.startsWith(p))) {
    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'path not allowed' }) }
  }

  const target = UPSTOX_BASE + upstoxPath + (event.rawQuery ? `?${event.rawQuery}` : '')
  try {
    const res = await fetch(target, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    const body = await res.text()
    return { statusCode: res.status, headers: CORS, body }
  } catch (err) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: err.message }) }
  }
}
