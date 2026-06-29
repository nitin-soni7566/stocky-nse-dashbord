import { useState } from 'react'

function tileColor(changePct) {
  if (changePct == null) return '#1a2a1a'
  if (changePct > 3)  return '#0B5E2A'
  if (changePct > 1)  return '#1E8449'
  if (changePct > 0)  return '#1a5c35'
  if (changePct > -1) return '#5c1a1a'
  if (changePct > -3) return '#922B21'
  return '#7F0000'
}

function signalDot(signal) {
  if (signal === 'STRONG')        return '🟢'
  if (signal === 'DOJI ONLY')     return '🟡'
  if (signal === 'BREAKOUT ONLY') return '🔵'
  return ''
}

function signalLabel(signal) {
  if (signal === 'STRONG')        return 'Doji + Breakout'
  if (signal === 'DOJI ONLY')     return 'Doji Only'
  if (signal === 'BREAKOUT ONLY') return 'Breakout Only'
  return signal ?? '—'
}

function Tooltip({ stock, anchorRect }) {
  if (!stock || !anchorRect) return null
  const left = Math.min(anchorRect.left + 10, window.innerWidth - 200)
  const top = anchorRect.top - 10 < 120 ? anchorRect.bottom + 6 : anchorRect.top - 10

  return (
    <div
      className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-3 shadow-xl text-xs pointer-events-none"
      style={{ left, top, minWidth: 190, transform: anchorRect.top - 10 >= 120 ? 'translateY(-100%)' : 'none' }}
    >
      <p className="font-bold text-[var(--text-primary)] mb-1.5 truncate max-w-[170px]">{stock.name}</p>
      <div className="space-y-0.5 text-[var(--text-secondary)]">
        <div className="flex justify-between gap-4">
          <span>Symbol</span>
          <span className="text-[var(--text-primary)] font-mono">{stock.symbol}</span>
        </div>
        {stock.currentPrice != null && (
          <div className="flex justify-between gap-4">
            <span>Price</span>
            <span className="text-[var(--text-primary)]">₹{stock.currentPrice.toFixed(2)}</span>
          </div>
        )}
        {stock.changePct != null && (
          <div className="flex justify-between gap-4">
            <span>Change</span>
            <span className={`font-semibold ${stock.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span>Signal</span>
          <span className="text-[var(--accent)]">{signalDot(stock.signal)} {signalLabel(stock.signal)}</span>
        </div>
        {stock.breakoutPct != null && (
          <div className="flex justify-between gap-4">
            <span>Breakout</span>
            <span className="text-green-400">+{parseFloat(stock.breakoutPct).toFixed(2)}%</span>
          </div>
        )}
        {stock.dojiBodyPct != null && (
          <div className="flex justify-between gap-4">
            <span>Doji body</span>
            <span className="text-yellow-400">{(stock.dojiBodyPct * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function ScanHeatmap({ scannedStocks }) {
  const [collapsed, setCollapsed] = useState({})
  const [hovered, setHovered] = useState(null) // { stock, anchorRect }

  if (!scannedStocks || scannedStocks.length === 0) return null

  const sectorMap = {}
  for (const stock of scannedStocks) {
    const sector = stock.sector || 'Other'
    if (!sectorMap[sector]) sectorMap[sector] = []
    sectorMap[sector].push(stock)
  }

  const sectors = Object.entries(sectorMap)
    .map(([name, stocks]) => {
      const avgChange = stocks.reduce((s, st) => s + (st.changePct ?? 0), 0) / stocks.length
      return { name, stocks, avgChange }
    })
    .sort((a, b) => b.avgChange - a.avgChange)

  const toggle = name => setCollapsed(c => ({ ...c, [name]: !c[name] }))

  return (
    <div className="flex flex-col gap-4 mt-2">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Scan Heatmap</h3>
        <span className="text-xs text-[var(--text-muted)]">grouped by sector</span>
        <div className="flex items-center gap-3 ml-auto text-xs text-[var(--text-muted)]">
          <span>🟢 Doji+Breakout</span>
          <span>🟡 Doji</span>
          <span>🔵 Breakout</span>
        </div>
      </div>

      {sectors.map(({ name, stocks, avgChange }) => {
        const isCollapsed = collapsed[name]
        const sorted = [...stocks].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))

        return (
          <div key={name} className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => toggle(name)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors text-left"
            >
              <span className="font-medium text-sm text-[var(--text-primary)]">{name}</span>
              <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                {stocks.length}
              </span>
              <span className={`text-xs font-semibold ${avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {avgChange >= 0 ? '▲' : '▼'} {Math.abs(avgChange).toFixed(2)}% avg
              </span>
              <span className="ml-auto text-[var(--text-muted)] text-xs select-none">
                {isCollapsed ? '▶' : '▼'}
              </span>
            </button>

            {!isCollapsed && (
              <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">
                {sorted.map(stock => {
                  const isStrong = stock.signal === 'STRONG'
                  const w = isStrong ? 90 : 80
                  const h = isStrong ? 85 : 75

                  return (
                    <div
                      key={stock.symbol}
                      onMouseEnter={e => setHovered({ stock, anchorRect: e.currentTarget.getBoundingClientRect() })}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        width: w,
                        height: h,
                        backgroundColor: tileColor(stock.changePct),
                        flexShrink: 0
                      }}
                      className="rounded-lg p-2 flex flex-col justify-between cursor-default border border-white/10 hover:brightness-125 hover:scale-105 transition-all duration-150"
                    >
                      <div className="flex items-start justify-between gap-0.5">
                        <span className="text-[10px] font-bold text-white leading-tight truncate flex-1">
                          {stock.symbol.replace('.NS', '')}
                        </span>
                        <span className="text-[10px] leading-none flex-shrink-0">{signalDot(stock.signal)}</span>
                      </div>
                      <span className="text-[9px] text-white/70 truncate leading-tight">
                        {stock.name?.split(' ').slice(0, 2).join(' ')}
                      </span>
                      <span className={`text-[10px] font-semibold ${(stock.changePct ?? 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {stock.changePct != null
                          ? `${stock.changePct >= 0 ? '+' : ''}${stock.changePct.toFixed(1)}%`
                          : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {hovered && <Tooltip stock={hovered.stock} anchorRect={hovered.anchorRect} />}
    </div>
  )
}
