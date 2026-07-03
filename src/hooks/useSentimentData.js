import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchBulkQuotes, fetchOHLCHistory, getUpstoxStatus, subscribeQuotes } from '../utils/upstoxApi.js'
import { isMarketOpen } from '../utils/marketHours.js'
import nifty500 from '../data/nifty500.json'

// normalized name → our internal index symbol (resolved to Upstox keys via instruments.js)
const INDEX_SYMBOLS = {
  nifty50:   '^NSEI',
  bankNifty: '^NSEBANK',
  indiaVix:  '^INDIAVIX',
  sensex:    '^BSESN',
  finNifty:  '^NIFTY_FIN_SERVICE'
}
const SYMBOL_TO_NAME = Object.fromEntries(Object.entries(INDEX_SYMBOLS).map(([n, s]) => [s, n]))

const blankIndex = () => ({ price: null, change: null, changePct: null, open: null, high: null, low: null, prevClose: null, loading: true, error: false, lastUpdated: null })

function initialIndices() {
  const o = {}
  for (const name of Object.keys(INDEX_SYMBOLS)) o[name] = blankIndex()
  o.giftNifty = { ...blankIndex(), loading: false, error: false }   // never available
  return o
}

export function useSentimentData() {
  const [indices, setIndices] = useState(initialIndices)
  const [adData, setAdData] = useState({
    nifty50:   { advancers: 0, decliners: 0, unchanged: 0, changePct: 0 },
    nifty500:  { advancers: 0, decliners: 0, unchanged: 0, changePct: 0 },
    niftyBank: { advancers: 0, decliners: 0, unchanged: 0, changePct: 0 }
  })
  const [stockQuotes, setStockQuotes] = useState(null)   // null = not loaded yet
  const [niftyHistory, setNiftyHistory] = useState([])
  const [sensexHistory, setSensexHistory] = useState([])
  const [vixStats, setVixStats] = useState({ high52: null, low52: null })
  const [fiiData, setFiiData] = useState([])
  const [fiiError, setFiiError] = useState(false)
  const [pageError, setPageError] = useState(false)
  const [sentiment, setSentiment] = useState({ score: null, label: null, color: '#888800', components: {} })

  // ─── REST snapshot (index quotes) ─────────────────────────────────────────────
  // Uses the Upstox proxy (fetchBulkQuotes → /api/upstox/rest) which works in both
  // dev (Express) and prod (Netlify function) — no dev-only endpoint dependency.
  const fetchQuotes = useCallback(async () => {
    const data = await fetchBulkQuotes(Object.values(INDEX_SYMBOLS))   // keyed by ^symbol
    if (!Object.keys(data).length) throw new Error('no index quotes returned')
    setPageError(false)
    setIndices(prev => {
      const next = { ...prev }
      for (const [name, sym] of Object.entries(INDEX_SYMBOLS)) {
        const q = data[sym]
        next[name] = q
          ? { ...prev[name], price: q.price, change: q.change, changePct: q.changePct,
              open: q.open, high: q.high, low: q.low, prevClose: q.prevClose,
              loading: false, error: false, lastUpdated: Date.now() }
          : { ...prev[name], loading: false, error: true }
      }
      next.giftNifty = { ...prev.giftNifty, loading: false, error: false }
      return next
    })
  }, [])

  const fetchInitialData = useCallback(async () => {
    try {
      await fetchQuotes()
    } catch (err) {
      console.error('Sentiment index-quotes failed:', err)
      setPageError(true)
      setIndices(prev => {
        const next = { ...prev }
        for (const name of Object.keys(INDEX_SYMBOLS)) next[name] = { ...prev[name], loading: false, error: true }
        return next
      })
    }

    try {
      const [nHist, sHist] = await Promise.all([fetchOHLCHistory('^NSEI', 10), fetchOHLCHistory('^BSESN', 10)])
      const nCloses = (nHist ?? []).map(c => c.close).filter(v => v != null)
      const sCloses = (sHist ?? []).map(c => c.close).filter(v => v != null)
      if (nCloses.length) setNiftyHistory(nCloses)
      if (sCloses.length) setSensexHistory(sCloses)
    } catch (err) { console.error('Index history failed:', err) }

    try {
      const res = await fetch('/api/fii-data')
      const data = await res.json()
      if (data.error || !Array.isArray(data)) { setFiiError(true); setFiiData([]) }
      else { setFiiError(false); setFiiData(data) }
    } catch (err) { console.error('FII fetch failed:', err); setFiiError(true) }
  }, [fetchQuotes])

  // ─── A/D stock quotes (Nifty 500 snapshot) ────────────────────────────────────
  const fetchStocks = useCallback(async () => {
    try {
      const data = await fetchBulkQuotes(nifty500.map(s => s.yahooSymbol))
      if (Object.keys(data).length) setStockQuotes(data)
    } catch (err) { console.error('Stock quotes failed:', err) }
  }, [])

  // VIX 52-week high/low (once on mount — barely changes intraday)
  useEffect(() => {
    fetchOHLCHistory('^INDIAVIX', 260)
      .then(hist => {
        const rows = (hist ?? []).filter(c => c.high != null && c.low != null)
        if (rows.length) setVixStats({ high52: Math.max(...rows.map(c => c.high)), low52: Math.min(...rows.map(c => c.low)) })
      })
      .catch(err => console.error('VIX 52w history failed:', err))
  }, [])

  // Initial load + periodic refresh
  useEffect(() => {
    fetchInitialData()
    fetchStocks()
    const slow = setInterval(fetchInitialData, 3 * 60 * 1000)
    const stocks = setInterval(() => { if (isMarketOpen()) fetchStocks() }, 30 * 1000)
    return () => { clearInterval(slow); clearInterval(stocks) }
  }, [fetchInitialData, fetchStocks])

  // ─── Live index ticks: SSE when available, else poll index-quotes ──────────────
  useEffect(() => {
    let cleanup = () => {}
    getUpstoxStatus().then(status => {
      if (status.streaming) {
        const symbols = Object.values(INDEX_SYMBOLS)
        const unsub = subscribeQuotes(symbols, quotes => {
          setIndices(prev => {
            const next = { ...prev }
            for (const [sym, q] of Object.entries(quotes)) {
              const name = SYMBOL_TO_NAME[sym]
              if (name && q.price != null) {
                next[name] = { ...prev[name], ...q, loading: false, error: false, lastUpdated: Date.now() }
              }
            }
            return next
          })
        })
        cleanup = unsub
      } else {
        const poll = setInterval(() => { if (isMarketOpen()) fetchQuotes().catch(() => {}) }, 5000)
        cleanup = () => clearInterval(poll)
      }
    })
    return () => cleanup()
  }, [fetchQuotes])

  // ─── Compute Advance/Decline from Nifty 500 snapshot ──────────────────────────
  useEffect(() => {
    if (!stockQuotes) return
    const quoteFor = s => stockQuotes[s.yahooSymbol]

    const tally = list => {
      const qs = list.map(quoteFor).filter(Boolean)
      return {
        advancers: qs.filter(q => q.changePct > 0).length,
        decliners: qs.filter(q => q.changePct < 0).length,
        unchanged: qs.filter(q => q.changePct === 0).length
      }
    }

    const n500 = { ...tally(nifty500), changePct: indices.nifty50.changePct ?? 0 }
    const bank = { ...tally(nifty500.filter(s => s.sector === 'Financial Services')), changePct: indices.bankNifty.changePct ?? 0 }
    const n50 = { ...tally(nifty500.slice(0, 50)), changePct: indices.nifty50.changePct ?? 0 }
    setAdData({ nifty50: n50, nifty500: n500, niftyBank: bank })
  }, [stockQuotes, indices.nifty50.changePct, indices.bankNifty.changePct])

  // ─── Sentiment score ──────────────────────────────────────────────────────────
  useEffect(() => {
    const vix = indices.indiaVix.price
    const niftyPrice = indices.nifty50.price
    if (vix == null || !stockQuotes) return

    const total = adData.nifty500.advancers + adData.nifty500.decliners
    const adScore = total > 0 ? Math.round((adData.nifty500.advancers / total) * 100) : 50

    const vixScore = vix < 12 ? 90 : vix < 15 ? 70 : vix < 20 ? 50 : vix < 25 ? 30 : 10

    let dmaScore = 55
    let dmaPct = null
    if (niftyHistory.length >= 5 && niftyPrice) {
      const avg = niftyHistory.reduce((a, b) => a + b, 0) / niftyHistory.length
      dmaPct = ((niftyPrice - avg) / avg) * 100
      dmaScore = dmaPct > 5 ? 85 : dmaPct > 2 ? 70 : dmaPct > 0 ? 55 : dmaPct > -2 ? 40 : 20
    }

    const lastFii = fiiData[0]?.net ?? null
    const fiiScore = lastFii == null ? 50
      : lastFii > 500 ? 85 : lastFii > 0 ? 65 : lastFii > -500 ? 40 : 25

    const score = Math.round(adScore * 0.25 + vixScore * 0.25 + dmaScore * 0.25 + fiiScore * 0.25)
    const label = score >= 80 ? 'EXTREME GREED' : score >= 60 ? 'GREED' : score >= 40 ? 'NEUTRAL' : score >= 20 ? 'FEAR' : 'EXTREME FEAR'
    const color = score >= 80 ? '#0B5E2A' : score >= 60 ? '#27AE60' : score >= 40 ? '#888800' : score >= 20 ? '#C0392B' : '#7F0000'

    setSentiment({
      score,
      label,
      color,
      components: {
        advanceDecline: { score: adScore, value: `${adData.nifty500.advancers}↑ ${adData.nifty500.decliners}↓` },
        vix: { score: vixScore, value: vix.toFixed(2) },
        dma200: { score: dmaScore, value: dmaPct == null ? '—' : `${dmaPct >= 0 ? '+' : ''}${dmaPct.toFixed(1)}%` },
        fiiFlow: { score: fiiScore, value: lastFii == null ? '—' : `${lastFii >= 0 ? '+' : '-'}${Math.abs(lastFii).toFixed(0)}Cr` }
      }
    })
  }, [adData, indices.indiaVix.price, indices.nifty50.price, fiiData, niftyHistory, stockQuotes])

  return { indices, adData, niftyHistory, sensexHistory, vixStats, fiiData, fiiError, sentiment, pageError, retry: fetchInitialData, stocksLoaded: !!stockQuotes }
}
