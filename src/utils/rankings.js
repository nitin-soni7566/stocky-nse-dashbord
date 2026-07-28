// Pure ranking helpers over a { symbol, ... }[] universe + a quotes map keyed by yahooSymbol.

export function getTopGainers(stocks, quotes, limit = 100) {
  return stocks
    .map(s => ({ ...s, quote: quotes[s.yahooSymbol] ?? null }))
    .filter(s => s.quote?.changePct != null)
    .sort((a, b) => b.quote.changePct - a.quote.changePct)
    .slice(0, limit)
}

export function getTopLosers(stocks, quotes, limit = 100) {
  return stocks
    .map(s => ({ ...s, quote: quotes[s.yahooSymbol] ?? null }))
    .filter(s => s.quote?.changePct != null)
    .sort((a, b) => a.quote.changePct - b.quote.changePct)
    .slice(0, limit)
}

export function getMostActive(stocks, quotes, limit = 100) {
  return stocks
    .map(s => ({ ...s, quote: quotes[s.yahooSymbol] ?? null }))
    .filter(s => s.quote?.volume != null)
    .sort((a, b) => b.quote.volume - a.quote.volume)
    .slice(0, limit)
}
