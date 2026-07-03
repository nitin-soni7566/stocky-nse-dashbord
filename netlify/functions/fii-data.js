// Latest FII cash flow from NSE (fiidiiTradeReact). Serverless → no accumulation,
// so it returns just the most recent trading day. On failure the client shows
// "FII data unavailable" and sentiment falls back to a neutral FII score.
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

exports.handler = async () => {
  try {
    const res = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
        Referer: 'https://www.nseindia.com/reports-fii-dii'
      }
    })
    if (!res.ok) throw new Error('NSE ' + res.status)
    const rows = await res.json()
    const fii = (Array.isArray(rows) ? rows : []).find(r => (r.category || '').toUpperCase().includes('FII'))
    if (!fii?.date) throw new Error('no FII row in NSE response')

    const net = parseFloat(fii.netValue) || 0
    const record = {
      date: fii.date,
      displayDate: String(parseInt(fii.date, 10) || fii.date.slice(0, 2)),
      buy: parseFloat(fii.buyValue) || 0,
      sell: parseFloat(fii.sellValue) || 0,
      net,
      type: net >= 0 ? 'buy' : 'sell'
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify([record]) }
  } catch (err) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: true, message: 'FII data unavailable' }) }
  }
}
