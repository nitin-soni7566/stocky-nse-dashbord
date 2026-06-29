import { useState, useEffect } from 'react'
import { fetchBulkQuotes } from '../../utils/yahooApi.js'
import { formatINR, formatVolume, formatChangePct } from '../../utils/formatters.js'
import { ChangePill, ChangeText } from '../UI/ChangePill.jsx'
import nifty500 from '../../data/nifty500.json'

function getTileColor(pct) {
  if (pct == null) return '#2A2A2A'
  if (pct > 3) return '#0B5E2A'
  if (pct > 1) return '#27AE60'
  if (pct > 0) return '#1E8449'
  if (pct > -1) return '#922B21'
  if (pct > -3) return '#C0392B'
  return '#7F0000'
}

const INDEX_SECTOR_FILTER = {
  '^CNXAUTO':          s => s.sector === 'Automobile and Auto Components',
  '^CNXFMCG':          s => s.sector === 'Fast Moving Consumer Goods',
  '^CNXPHARMA':        s => s.sector === 'Healthcare' || s.sector === 'Chemicals',
  '^CNXIT':            s => s.sector === 'Information Technology',
  '^NSEBANK':          s => s.sector === 'Financial Services',
  '^CNXREALTY':        s => s.sector === 'Realty' || s.sector === 'Construction',
  '^CNXINFRA':         s => s.sector === 'Capital Goods' || s.sector === 'Construction' || s.sector === 'Services' || s.sector === 'Power',
  '^CNXENERGY':        s => s.sector === 'Oil Gas & Consumable Fuels' || s.sector === 'Power',
  '^CNXMETAL':         s => s.sector === 'Metals & Mining',
  '^CNXMEDIA':         s => s.sector === 'Media Entertainment & Publication' || s.sector === 'Telecommunication',
  '^CNXPSUBANK':       s => s.sector === 'Financial Services',
  '^CNXPVTBANK':       s => s.sector === 'Financial Services',
  '^NIFTY_FIN_SERVICE':s => s.sector === 'Financial Services',
  '^CNXFIN':           s => s.sector === 'Financial Services',
  '^NSEI':             () => true,
  '^CNX100':           () => true,
  '^CNX500':           () => true,
  'NIFTYIND.NS':       s => s.sector === 'Capital Goods' || s.sector === 'Automobile and Auto Components' || s.sector === 'Chemicals' || s.sector === 'Textiles',
}

export function IndexDrawer({ index, quote, onClose }) {
  const [tab, setTab] = useState('tiles')
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(true)

  const filterFn = INDEX_SECTOR_FILTER[index.symbol] ?? (() => true)
  const stocks = nifty500.filter(filterFn).slice(0, 80)

  useEffect(() => {
    setLoading(true)
    setQuotes({})
    const load = async () => {
      const syms = stocks.map(s => s.yahooSymbol)
      const data = await fetchBulkQuotes(syms)
      setQuotes(data)
      setLoading(false)
    }
    load()
  }, [index.symbol])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const pct = quote?.changePct ?? null
  const { text: changeText, color: changeColor } = formatChangePct(pct)

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className="drawer-enter bg-[var(--bg-secondary)] border-l border-[var(--border)] flex flex-col shadow-2xl"
        style={{ width: '100%', maxWidth: 480 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl font-bold">✕</button>
          <span className="font-bold text-[var(--text-primary)] text-sm uppercase tracking-wide">{index.name}</span>
          <span className="font-mono text-sm font-bold" style={{ color: changeColor }}>{changeText}</span>
          {quote?.price && (
            <span className="font-mono text-sm text-[var(--text-secondary)] ml-auto">
              {quote.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] flex-shrink-0">
          {[{ id: 'tiles', label: '🟦 Stock Tiles' }, { id: 'table', label: '📋 Stock Table' }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${tab === t.id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-auto px-4 py-2.5 text-xs text-[var(--text-muted)] self-center">
            {stocks.length} stocks
          </span>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {loading ? (
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="skeleton rounded" style={{ height: 70 }} />
              ))}
            </div>
          ) : tab === 'tiles' ? (
            <TilesView stocks={stocks} quotes={quotes} />
          ) : (
            <TableView stocks={stocks} quotes={quotes} />
          )}
        </div>
      </div>
    </div>
  )
}

function TilesView({ stocks, quotes }) {
  const sorted = [...stocks].sort((a, b) =>
    (quotes[b.yahooSymbol]?.changePct ?? -9999) - (quotes[a.yahooSymbol]?.changePct ?? -9999)
  )
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {sorted.map(stock => {
        const q = quotes[stock.yahooSymbol]
        const pct = q?.changePct ?? null
        const bg = getTileColor(pct)
        return (
          <div
            key={stock.symbol}
            title={`${stock.name}\n₹${q?.price ?? '—'} | ${pct != null ? (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%' : '—'} | Vol: ${q?.volume != null ? formatVolume(q.volume) : '—'}`}
            style={{ background: bg, borderRadius: 6, padding: '6px 4px', minHeight: 70, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'default' }}
          >
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {stock.symbol}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#fff', textAlign: 'center' }}>
              {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.75)' }}>
              {q?.price != null ? `₹${q.price.toFixed(0)}` : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TableView({ stocks, quotes }) {
  const sorted = [...stocks].sort((a, b) =>
    (quotes[b.yahooSymbol]?.changePct ?? -9999) - (quotes[a.yahooSymbol]?.changePct ?? -9999)
  )
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-[var(--bg-secondary)]">
        <tr className="border-b border-[var(--border)]">
          {['Symbol', 'Company', 'Price', 'Chg (₹)', 'Chg%', 'Volume'].map(h => (
            <th key={h} className="px-2 py-2 text-left text-[var(--text-muted)] uppercase tracking-wider font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map(s => {
          const q = quotes[s.yahooSymbol]
          return (
            <tr key={s.symbol} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)]">
              <td className="px-2 py-2 font-mono font-semibold text-[var(--accent)]">{s.symbol}</td>
              <td className="px-2 py-2 text-[var(--text-secondary)] max-w-[120px] truncate">{s.name}</td>
              <td className="px-2 py-2 font-mono text-[var(--text-primary)]">{q?.price != null ? formatINR(q.price) : '—'}</td>
              <td className="px-2 py-2"><ChangeText value={q?.change} /></td>
              <td className="px-2 py-2"><ChangePill value={q?.changePct} /></td>
              <td className="px-2 py-2 font-mono text-[var(--text-secondary)]">{q?.volume != null ? formatVolume(q.volume) : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
