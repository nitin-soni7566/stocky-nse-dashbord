import { useState, useEffect, useRef } from 'react'
import { fetchBulkQuotes } from '../../utils/upstoxApi.js'
import { formatINR, formatChangePct } from '../../utils/formatters.js'
import { useApp } from '../../context/AppContext.jsx'

const TICKER_INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY' },
  { symbol: '^CNXIT', name: 'NIFTY IT' },
  { symbol: '^CNXAUTO', name: 'NIFTY AUTO' },
  { symbol: '^CNXPHARMA', name: 'NIFTY PHARMA' },
  { symbol: '^CNXFMCG', name: 'NIFTY FMCG' },
  { symbol: '^CNXMETAL', name: 'NIFTY METAL' },
  { symbol: '^CNXENERGY', name: 'NIFTY ENERGY' },
  { symbol: '^CNXREALTY', name: 'NIFTY REALTY' },
  { symbol: '^CNXMEDIA', name: 'NIFTY MEDIA' },
  { symbol: '^CNXINFRA', name: 'NIFTY INFRA' },
  { symbol: '^CNX500', name: 'NIFTY 500' },
]

export function IndexTicker() {
  const [quotes, setQuotes] = useState({})
  const { dispatch } = useApp()

  useEffect(() => {
    const load = async () => {
      const syms = TICKER_INDICES.map(i => i.symbol)
      const data = await fetchBulkQuotes(syms)
      setQuotes(data)
    }
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [])

  const items = TICKER_INDICES.map(idx => {
    const q = quotes[idx.symbol]
    return { ...idx, price: q?.price, changePct: q?.changePct }
  })

  // duplicate for seamless loop
  const doubled = [...items, ...items]

  return (
    <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden py-1.5 flex-shrink-0">
      <div className="ticker-track flex gap-0">
        {doubled.map((item, i) => {
          const { text, color } = formatChangePct(item.changePct)
          return (
            <button
              key={i}
              onClick={() => dispatch({ type: 'SET_VIEW', payload: 'heatmap' })}
              className="flex items-center gap-2 px-4 flex-shrink-0 hover:bg-[var(--bg-hover)] transition-colors rounded py-0.5"
            >
              <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">{item.name}</span>
              <span className="font-mono text-xs text-[var(--text-primary)] whitespace-nowrap">
                {item.price != null ? formatINR(item.price) : '—'}
              </span>
              <span className="font-mono text-xs whitespace-nowrap font-semibold" style={{ color }}>
                {item.changePct != null ? text : '—'}
              </span>
              <span className="text-[var(--border)] ml-2">|</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
