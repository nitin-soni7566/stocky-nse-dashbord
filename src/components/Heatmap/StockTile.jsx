import { Tooltip } from '../UI/Tooltip.jsx'
import { formatINR, formatChange } from '../../utils/formatters.js'

function getTileColor(changePct) {
  if (changePct == null) return '#2A2A2A'
  if (changePct < -3) return '#7F0000'
  if (changePct < -1) return '#C0392B'
  if (changePct < 0) return '#922B21'
  if (changePct < 1) return '#1E8449'
  if (changePct < 3) return '#27AE60'
  return '#0B5E2A'
}

function getTextColor(changePct) {
  if (changePct == null) return '#555555'
  return Math.abs(changePct) > 1 ? '#ffffff' : '#E8F8F0'
}

export function StockTile({ stock }) {
  const { quote } = stock
  const changePct = quote?.changePct ?? null
  const bg = getTileColor(changePct)
  const fg = getTextColor(changePct)

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-mono font-bold">{stock.symbol}</div>
      <div className="text-[var(--text-muted)]">{stock.name}</div>
      {quote?.price != null && <div>{formatINR(quote.price)}</div>}
      {changePct != null && (
        <div className={changePct >= 0 ? 'text-green-400' : 'text-red-400'}>
          {formatChange(changePct, true)}
        </div>
      )}
    </div>
  )

  return (
    <Tooltip content={tooltipContent}>
      <div
        className="rounded p-1.5 cursor-pointer transition-opacity hover:opacity-80 select-none"
        style={{ backgroundColor: bg, color: fg, minWidth: 40, minHeight: 36 }}
      >
        <div className="font-mono text-[10px] font-semibold leading-tight truncate">{stock.symbol}</div>
        {changePct != null && (
          <div className="font-mono text-[10px] font-bold leading-tight">{formatChange(changePct, true)}</div>
        )}
      </div>
    </Tooltip>
  )
}
