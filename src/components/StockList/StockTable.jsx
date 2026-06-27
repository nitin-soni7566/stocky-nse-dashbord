import { SkeletonRow } from '../UI/Skeleton.jsx'
import { StockRow } from './StockRow.jsx'

const COL_HEADERS = ['#', 'Symbol', 'Company', 'Price (₹)', 'Chg (₹)', 'Chg %', 'High', 'Low', 'Volume', 'Prev Close']

export function StockTable({ stocks, quotes, prevQuotes, loading, onRowClick }) {
  if (loading && stocks.length === 0) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <TableHead />
            <tbody>
              {Array.from({ length: 20 }).map((_, i) => <SkeletonRow key={i} cols={10} />)}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <TableHead />
          <tbody>
            {stocks.map((stock, i) => (
              <StockRow
                key={stock.symbol}
                index={i}
                stock={stock}
                quote={quotes[stock.yahooSymbol] ?? null}
                prevQuote={prevQuotes?.[stock.yahooSymbol] ?? null}
                onClick={onRowClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TableHead() {
  return (
    <thead className="sticky top-0 z-10 bg-[var(--bg-secondary)]">
      <tr className="border-b border-[var(--border)]">
        {COL_HEADERS.map((h, i) => (
          <th
            key={h}
            className={`px-3 py-2.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap
              ${i >= 3 ? 'text-right' : 'text-left'} ${i === 0 ? 'w-10' : ''}`}
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
  )
}
