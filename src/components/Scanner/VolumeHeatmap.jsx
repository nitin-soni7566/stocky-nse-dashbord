import { useState } from 'react'
import { formatVolume } from '../../utils/formatters.js'

function tileColor(changePct) {
  if (changePct == null) return '#1a2a1a'
  if (changePct > 3)  return '#0B5E2A'
  if (changePct > 1)  return '#1E8449'
  if (changePct > 0)  return '#1a5c35'
  if (changePct > -1) return '#5c1a1a'
  if (changePct > -3) return '#922B21'
  return '#7F0000'
}

function ratioBadgeColor(ratio) {
  if (ratio >= 10) return '#c084fc'
  if (ratio >= 5)  return '#818cf8'
  if (ratio >= 3)  return '#60a5fa'
  return '#38bdf8'
}

function Tooltip({ stock, anchorRect }) {
  if (!stock || !anchorRect) return null
  const left = Math.min(anchorRect.left + 10, window.innerWidth - 210)
  const top = anchorRect.top - 10 < 130 ? anchorRect.bottom + 6 : anchorRect.top - 10

  return (
    <div
      className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-3 shadow-xl text-xs pointer-events-none"
      style={{ left, top, minWidth: 200, transform: anchorRect.top - 10 >= 130 ? 'translateY(-100%)' : 'none' }}
    >
      <p className="font-bold text-[var(--text-primary)] mb-1.5 truncate max-w-[180px]">{stock.name}</p>
      <div className="space-y-0.5 text-[var(--text-secondary)]">
        <div className="flex justify-between gap-4">
          <span>Symbol</span>
          <span className="text-[var(--text-primary)] font-mono">{stock.symbol}</span>
        </div>
        {stock.price != null && (
          <div className="flex justify-between gap-4">
            <span>Price</span>
            <span className="text-[var(--text-primary)]">₹{stock.price.toFixed(2)}</span>
          </div>
        )}
        {stock.changePct != null && (
          <div className="flex justify-between gap-4">
            <span>Change</span>
            <span className={stock.changePct >= 0 ? 'text-green-400' : 'text-red-400'}>
              {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span>Today Vol</span>
          <span className="text-blue-300 font-semibold">{formatVolume(stock.todayVolume)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Avg Vol</span>
          <span className="text-[var(--text-primary)]">{formatVolume(stock.avgVolume)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Ratio</span>
          <span className="text-purple-300 font-bold">{stock.volumeRatio.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  )
}

export function VolumeHeatmap({ results }) {
  const [collapsed, setCollapsed] = useState({})
  const [hovered, setHovered] = useState(null)

  if (!results || results.length === 0) return null

  const sectorMap = {}
  for (const stock of results) {
    const sector = stock.sector || 'Other'
    if (!sectorMap[sector]) sectorMap[sector] = []
    sectorMap[sector].push(stock)
  }

  const sectors = Object.entries(sectorMap)
    .map(([name, stocks]) => {
      const avgRatio = stocks.reduce((s, st) => s + (st.volumeRatio ?? 0), 0) / stocks.length
      return { name, stocks, avgRatio }
    })
    .sort((a, b) => b.avgRatio - a.avgRatio)

  const toggle = name => setCollapsed(c => ({ ...c, [name]: !c[name] }))

  return (
    <div className="flex flex-col gap-4 mt-2">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Volume Heatmap</h3>
        <span className="text-xs text-[var(--text-muted)]">grouped by sector · color = price direction</span>
        <div className="flex items-center gap-2 ml-auto text-xs text-[var(--text-muted)]">
          <span className="text-sky-400 font-semibold">ratio</span> = today vol ÷ avg vol
        </div>
      </div>

      {sectors.map(({ name, stocks, avgRatio }) => {
        const isCollapsed = collapsed[name]
        const sorted = [...stocks].sort((a, b) => b.volumeRatio - a.volumeRatio)

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
              <span className="text-xs font-semibold text-sky-400">
                avg {avgRatio.toFixed(1)}x vol
              </span>
              <span className="ml-auto text-[var(--text-muted)] text-xs select-none">
                {isCollapsed ? '▶' : '▼'}
              </span>
            </button>

            {!isCollapsed && (
              <div className="px-4 pb-4 pt-1 flex flex-wrap gap-2">
                {sorted.map(stock => (
                  <div
                    key={stock.symbol}
                    onMouseEnter={e => setHovered({ stock, anchorRect: e.currentTarget.getBoundingClientRect() })}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      width: 88,
                      height: 80,
                      backgroundColor: tileColor(stock.changePct),
                      flexShrink: 0
                    }}
                    className="rounded-lg p-2 flex flex-col justify-between cursor-default border border-white/10 hover:brightness-125 hover:scale-105 transition-all duration-150"
                  >
                    <div className="flex items-start justify-between gap-0.5">
                      <span className="text-[10px] font-bold text-white leading-tight truncate flex-1">
                        {stock.symbol}
                      </span>
                    </div>
                    <span
                      className="text-[11px] font-bold leading-tight self-center"
                      style={{ color: ratioBadgeColor(stock.volumeRatio) }}
                    >
                      {stock.volumeRatio.toFixed(1)}x
                    </span>
                    <span className={`text-[10px] font-semibold ${(stock.changePct ?? 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {stock.changePct != null
                        ? `${stock.changePct >= 0 ? '+' : ''}${stock.changePct.toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {hovered && <Tooltip stock={hovered.stock} anchorRect={hovered.anchorRect} />}
    </div>
  )
}
