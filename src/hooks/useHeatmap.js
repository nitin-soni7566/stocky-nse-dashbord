import { useMemo } from 'react'

export function useHeatmap(symbols, quotes) {
  return useMemo(() => {
    const sectors = {}
    for (const stock of symbols) {
      const sector = stock.sector || 'Unknown'
      if (!sectors[sector]) sectors[sector] = []
      const q = quotes[stock.yahooSymbol]
      sectors[sector].push({ ...stock, quote: q ?? null })
    }

    return Object.entries(sectors)
      .map(([sector, stocks]) => {
        const stocksWithData = stocks.filter(s => s.quote?.changePct != null)
        const avgChange = stocksWithData.length
          ? stocksWithData.reduce((sum, s) => sum + s.quote.changePct, 0) / stocksWithData.length
          : null
        return { sector, stocks, avgChange, count: stocks.length }
      })
      .sort((a, b) => b.count - a.count)
  }, [symbols, quotes])
}
