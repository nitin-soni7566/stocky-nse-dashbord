const https = require('https')
const http = require('http')

// Module-level cache — survives warm Lambda invocations
let yahooCrumb = null
let yahooCookies = null
let crumbExpiry = 0

const CACHE = new Map()
const CACHE_TTL = 30000

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 15000
    }, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')) })
    req.end()
  })
}

async function getYahooCrumb() {
  if (yahooCrumb && Date.now() < crumbExpiry) return yahooCrumb

  try {
    const homeRes = await fetchUrl('https://finance.yahoo.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })

    const setCookieHeader = homeRes.headers['set-cookie'] ?? []
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader.map(c => c.split(';')[0]).join('; ')
      : setCookieHeader.split(';')[0]

    yahooCookies = cookies

    const crumbRes = await fetchUrl('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Cookie': yahooCookies
      }
    })

    yahooCrumb = crumbRes.body.trim()
    crumbExpiry = Date.now() + 60 * 60 * 1000
    return yahooCrumb
  } catch (err) {
    console.error('Crumb fetch error:', err.message)
    return null
  }
}

exports.handler = async (event) => {
  const url = event.queryStringParameters?.url
  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: 'url param required' }) }
  }

  const cached = CACHE.get(url)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(cached.data) }
  }

  try {
    const crumb = await getYahooCrumb()
    let fetchUrl2 = url
    if (url.includes('finance.yahoo.com') && crumb) {
      fetchUrl2 += (url.includes('?') ? '&' : '?') + `crumb=${encodeURIComponent(crumb)}`
    }

    const res = await fetchUrl(fetchUrl2, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': yahooCookies ?? '',
        'Referer': 'https://finance.yahoo.com/'
      }
    })

    if (res.status === 401) {
      yahooCrumb = null
      crumbExpiry = 0
      return { statusCode: 401, body: JSON.stringify({ error: 'Yahoo auth failed, retry' }) }
    }

    const data = JSON.parse(res.body)
    CACHE.set(url, { data, ts: Date.now() })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
