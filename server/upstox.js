// Upstox integration for the Express dev server:
//   • authenticated REST proxy   GET  /api/upstox/rest/<upstox-path>
//   • capability probe           GET  /api/upstox/status
//   • live tick stream (SSE)     GET  /api/upstox/stream
//   • subscription control       POST /api/upstox/subscribe   { keys: [...] }
//
// One upstream Upstox WebSocket (protobuf) is shared across all browser SSE clients.
// The access token stays server-side; the browser never sees it.
import axios from 'axios'
import WebSocket from 'ws'
import protobuf from 'protobufjs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPSTOX_BASE = 'https://api.upstox.com'
const ALLOWED_PREFIXES = ['/v2/market-quote/', '/v3/historical-candle/']

const token = () => process.env.UPSTOX_ACCESS_TOKEN
const authHeaders = () => ({ Authorization: `Bearer ${token()}`, Accept: 'application/json' })

// ─── REST proxy cache ───────────────────────────────────────────────────────────
const cache = new Map()
const CACHE_TTL = 1500

// ─── WebSocket relay ──────────────────────────────────────────────────────────
let FeedResponse = null
const sseClients = new Set()      // Express res objects
const desired = new Set()         // instrument keys we want subscribed
const subscribed = new Set()      // instrument keys the upstream WS has
let ws = null
let wsOpen = false
let connecting = false
let backoff = 1000

async function loadProto() {
  if (FeedResponse) return FeedResponse
  const root = await protobuf.load(resolve(__dirname, 'proto/MarketDataFeedV3.proto'))
  FeedResponse = root.lookupType('com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse')
  return FeedResponse
}

function sendWs(method, keys) {
  if (!wsOpen || !keys.length) return
  const msg = { guid: `${method}-${Date.now()}`, method, data: { mode: 'full', instrumentKeys: keys } }
  ws.send(Buffer.from(JSON.stringify(msg)))
}

function syncSubscriptions() {
  if (!wsOpen) return
  const toAdd = [...desired].filter(k => !subscribed.has(k))
  const toRemove = [...subscribed].filter(k => !desired.has(k))
  if (toRemove.length) { sendWs('unsub', toRemove); toRemove.forEach(k => subscribed.delete(k)) }
  if (toAdd.length) { sendWs('sub', toAdd); toAdd.forEach(k => subscribed.add(k)) }
}

async function connect() {
  if (connecting || wsOpen || !token()) return
  connecting = true
  try {
    await loadProto()
    const res = await axios.get(`${UPSTOX_BASE}/v3/feed/market-data-feed/authorize`, { headers: authHeaders(), timeout: 15000 })
    const uri = res.data?.data?.authorized_redirect_uri ?? res.data?.data?.authorizedRedirectUri
    if (!uri) throw new Error('no authorized_redirect_uri')

    ws = new WebSocket(uri)
    ws.binaryType = 'arraybuffer'

    ws.on('open', () => {
      wsOpen = true
      connecting = false
      backoff = 1000
      subscribed.clear()
      console.log('Upstox WS connected')
      syncSubscriptions()
    })
    ws.on('message', data => broadcast(decodeFeed(data)))
    ws.on('close', () => { wsOpen = false; scheduleReconnect() })
    ws.on('error', err => { console.error('Upstox WS error:', err.message); try { ws.close() } catch {} })
  } catch (err) {
    connecting = false
    console.error('Upstox WS connect failed:', err.message)
    scheduleReconnect()
  }
}

function scheduleReconnect() {
  connecting = false
  if (!sseClients.size) return           // nobody listening → stay disconnected
  setTimeout(connect, backoff)
  backoff = Math.min(backoff * 2, 15000)
}

function decodeFeed(data) {
  try {
    const buf = new Uint8Array(data)
    const obj = FeedResponse.toObject(FeedResponse.decode(buf), { longs: Number, defaults: false })
    const ticks = {}
    for (const [key, feed] of Object.entries(obj.feeds ?? {})) {
      const t = extractTick(feed)
      if (t) ticks[key] = t
    }
    return ticks
  } catch {
    return null
  }
}

function extractTick(feed) {
  const ff = feed.fullFeed?.marketFF ?? feed.fullFeed?.indexFF
  const ltpc = feed.ltpc ?? ff?.ltpc ?? feed.firstLevelWithGreeks?.ltpc
  if (!ltpc) return null
  const ohlcArr = ff?.marketOHLC?.ohlc ?? []
  const day = ohlcArr.find(o => o.interval === '1d') ?? null
  return {
    ltp: ltpc.ltp ?? null,
    cp: ltpc.cp ?? null,
    vol: ff?.vtt ?? null,
    open: day?.open ?? null,
    high: day?.high ?? null,
    low: day?.low ?? null
  }
}

function broadcast(ticks) {
  if (!ticks || !Object.keys(ticks).length || !sseClients.size) return
  const line = `data: ${JSON.stringify(ticks)}\n\n`
  for (const res of sseClients) res.write(line)
}

// ─── Route mounting ─────────────────────────────────────────────────────────────
export function mountUpstox(app) {
  app.get('/api/upstox/status', (req, res) => {
    res.json({ configured: !!token(), streaming: !!token() })
  })

  app.post('/api/upstox/subscribe', (req, res) => {
    const keys = Array.isArray(req.body?.keys) ? req.body.keys : []
    desired.clear()
    keys.forEach(k => desired.add(k))
    if (wsOpen) syncSubscriptions()
    else connect()
    res.json({ ok: true, count: desired.size })
  })

  app.get('/api/upstox/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })
    res.write('retry: 3000\n\n')
    sseClients.add(res)
    connect()

    const ping = setInterval(() => res.write(': ping\n\n'), 20000)
    req.on('close', () => {
      clearInterval(ping)
      sseClients.delete(res)
      if (!sseClients.size && ws) { try { ws.close() } catch {} }
    })
  })

  // Authenticated REST passthrough: /api/upstox/rest/<upstox path + query>
  app.get('/api/upstox/rest/*', async (req, res) => {
    if (!token()) return res.status(503).json({ error: 'Upstox not configured' })
    const target = req.originalUrl.replace(/^\/api\/upstox\/rest/, '')
    const pathname = target.split('?')[0]
    if (!ALLOWED_PREFIXES.some(p => pathname.startsWith(p))) {
      return res.status(403).json({ error: 'path not allowed' })
    }

    const cached = cache.get(target)
    if (cached && Date.now() - cached.ts < CACHE_TTL) return res.json(cached.data)

    try {
      const upstream = await axios.get(UPSTOX_BASE + target, { headers: authHeaders(), timeout: 15000 })
      cache.set(target, { data: upstream.data, ts: Date.now() })
      res.json(upstream.data)
    } catch (err) {
      res.status(err.response?.status ?? 500).json(err.response?.data ?? { error: err.message })
    }
  })
}
