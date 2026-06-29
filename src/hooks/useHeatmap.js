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
        // Sort stocks within sector: gainers first, losers last, no-data at bottom
        const sortedStocks = [...stocks].sort((a, b) => {
          const ca = a.quote?.changePct ?? -9999
          const cb = b.quote?.changePct ?? -9999
          return cb - ca
        })
        return { sector, stocks: sortedStocks, avgChange, count: stocks.length }
      })
      // Sort sectors: best avg change first, sectors with no data at bottom
      .sort((a, b) => (b.avgChange ?? -9999) - (a.avgChange ?? -9999))
  }, [symbols, quotes])
}
