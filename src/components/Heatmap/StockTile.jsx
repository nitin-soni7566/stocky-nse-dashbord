import { memo } from 'react'
import { Tooltip } from '../UI/Tooltip.jsx'
import { formatINR, formatChange } from '../../utils/formatters.js'
import { getHeatColor, getHeatTextColor } from '../../utils/heatColor.js'

export const StockTile = memo(function StockTile({ stock, onClick }) {
  const { quote } = stock
  const changePct = quote?.changePct ?? null
  const bg = getHeatColor(changePct)
  const fg = getHeatTextColor(changePct)

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-mono font-bold">{stock.symbol}</div>
      <div className="text-[var(--text-muted)]">{stock.name}</div>
      {stock.sector && <div className="text-[var(--text-muted)]">{stock.sector}</div>}
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
        onClick={() => onClick?.(stock)}
        className="rounded-md p-2 cursor-pointer transition-all duration-300 hover:opacity-80 hover:scale-[1.03] select-none flex flex-col gap-0.5"
        style={{ backgroundColor: bg, color: fg, width: 112, minHeight: 62 }}
      >
        <div className="font-mono text-[12px] font-semibold leading-tight truncate">{stock.symbol}</div>
        {changePct != null && (
          <div className="font-mono text-[13px] font-bold leading-tight">{formatChange(changePct, true)}</div>
        )}
        {stock.sector && (
          <div className="text-[9px] leading-tight truncate" style={{ opacity: 0.72 }}>{stock.sector}</div>
        )}
      </div>
    </Tooltip>
  )
})
