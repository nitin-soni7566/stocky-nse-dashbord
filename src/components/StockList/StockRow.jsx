import { useEffect, useRef, useState } from 'react'
import { formatINR, formatVolume } from '../../utils/formatters.js'
import { ChangePill, ChangeText } from '../UI/ChangePill.jsx'

export function StockRow({ index, stock, quote, onClick }) {
  const [flash, setFlash] = useState(null)
  const prevPrice = useRef(null)

  useEffect(() => {
    if (!quote?.price || prevPrice.current === null) {
      prevPrice.current = quote?.price ?? null
      return
    }
    if (quote.price > prevPrice.current) setFlash('flash-green')
    else if (quote.price < prevPrice.current) setFlash('flash-red')
    prevPrice.current = quote.price
    const t = setTimeout(() => setFlash(null), 600)
    return () => clearTimeout(t)
  }, [quote?.price])

  const changePct = quote?.changePct ?? null
  const rowBg = changePct > 0 ? 'row-green' : changePct < 0 ? 'row-red' : ''

  return (
    <tr
      onClick={() => onClick(stock)}
      className={`border-b border-[var(--border)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)] ${rowBg} ${flash ?? ''}`}
    >
      <td className="px-3 py-2.5 text-xs text-[var(--text-muted)] w-10">{index + 1}</td>
      <td className="px-3 py-2.5">
        <span className="font-mono font-semibold text-sm text-[var(--accent)]">{stock.symbol}</span>
      </td>
      <td className="px-3 py-2.5 text-xs text-[var(--text-secondary)] max-w-[200px] truncate">{stock.name}</td>
      <td className="px-3 py-2.5 font-mono text-sm text-right text-[var(--text-primary)]">
        {quote?.price != null ? formatINR(quote.price) : <span className="text-[var(--text-muted)]">—</span>}
      </td>
      <td className="px-3 py-2.5 text-right">
        <ChangeText value={quote?.change} />
      </td>
      <td className="px-3 py-2.5 text-right">
        <ChangePill value={changePct} />
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-right text-[var(--text-secondary)]">
        {quote?.high != null ? formatINR(quote.high) : '—'}
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-right text-[var(--text-secondary)]">
        {quote?.low != null ? formatINR(quote.low) : '—'}
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-right text-[var(--text-secondary)]">
        {quote?.volume != null ? formatVolume(quote.volume) : '—'}
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-right text-[var(--text-secondary)]">
        {quote?.prevClose != null ? formatINR(quote.prevClose) : '—'}
      </td>
    </tr>
  )
}
