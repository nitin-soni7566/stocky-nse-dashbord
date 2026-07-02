import { useState, useEffect } from 'react'
import { Skeleton } from '../UI/Skeleton.jsx'
import { GREEN, RED } from './common.jsx'

const R = 85
const CX = 100
const CY = 95

// fraction 0..1 (left→right) → point on the upper semicircle
function arcPoint(f) {
  const theta = (180 - f * 180) * (Math.PI / 180)
  return [CX + R * Math.cos(theta), CY - R * Math.sin(theta)]
}
function arcPath(f1, f2) {
  const [x1, y1] = arcPoint(f1)
  const [x2, y2] = arcPoint(f2)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

const SEGMENTS = [
  [0.0, 0.2, '#7F0000'],
  [0.2, 0.4, '#C0392B'],
  [0.4, 0.6, '#888800'],
  [0.6, 0.8, '#27AE60'],
  [0.8, 1.0, '#0B5E2A']
]

function MiniBar({ score }) {
  return (
    <div style={{ width: 64, height: 5, background: '#1e1e1e', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${(score / 100) * 64}px`, height: 5, background: score > 50 ? GREEN : RED }} />
    </div>
  )
}

function Tag({ score, text }) {
  const style = score > 50
    ? { background: 'rgba(0,200,83,0.12)', color: GREEN }
    : score < 50
      ? { background: 'rgba(229,57,53,0.12)', color: RED }
      : { background: 'rgba(136,136,0,0.12)', color: '#888800' }
  return <span style={{ ...style, fontSize: 10, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>{text}</span>
}

export function SentimentGauge({ sentiment, indices }) {
  const score = sentiment.score
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    if (score == null) { setAnimated(0); return }
    const id = requestAnimationFrame(() => setAnimated(score))
    return () => cancelAnimationFrame(id)
  }, [score])

  const c = sentiment.components ?? {}
  const rows = [
    { name: 'Advance / Decline', value: c.advanceDecline?.value, score: c.advanceDecline?.score, tag: s => (s > 50 ? 'Bullish' : 'Bearish') },
    { name: 'India VIX', value: indices.indiaVix?.price != null ? indices.indiaVix.price.toFixed(2) : '—', score: c.vix?.score, tag: s => (s > 60 ? 'Calm' : s > 40 ? 'Rising' : 'High Fear') },
    { name: 'Nifty vs 200 DMA', value: c.dma200?.value, score: c.dma200?.score, tag: s => (s > 50 ? 'Above' : 'Below') },
    { name: 'FII Flow', value: c.fiiFlow?.value, score: c.fiiFlow?.score, tag: s => (s > 50 ? 'Buying' : 'Selling') }
  ]

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse inline-block" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Market sentiment</h3>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        {/* Gauge */}
        <div className="flex flex-col items-center" style={{ minWidth: 200 }}>
          <svg viewBox="0 0 200 115" width="200" height="115">
            <path d={arcPath(0, 1)} fill="none" stroke="#1e1e1e" strokeWidth="14" strokeLinecap="round" />
            {SEGMENTS.map(([a, b, col]) => (
              <path key={col} d={arcPath(a, b)} fill="none" stroke={col} strokeWidth="12" strokeLinecap="butt" />
            ))}
            <line
              x1={CX} y1={CY} x2={CX - 68} y2={CY}
              stroke="#f0f0f0" strokeWidth="2.5" strokeLinecap="round"
              style={{ transformOrigin: `${CX}px ${CY}px`, transform: `rotate(${(animated / 100) * 180}deg)`, transition: 'transform 1.2s ease-out' }}
            />
            <circle cx={CX} cy={CY} r="5" fill="#f0f0f0" />
            <text x="10" y="110" fontSize="9" fill="#888">Fear</text>
            <text x="170" y="110" fontSize="9" fill="#888">Greed</text>
          </svg>
          <div className="text-[32px] font-mono leading-none mt-1" style={{ color: sentiment.color }}>{score ?? '—'}</div>
          <div className="text-[11px] mt-1" style={{ color: sentiment.color, letterSpacing: 1 }}>{sentiment.label ?? 'Loading…'}</div>
        </div>

        {/* Breakdown table */}
        <div className="flex-1 w-full">
          {rows.map(r => (
            <div key={r.name} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
              <span className="text-[12px] text-[var(--text-secondary)] flex-1 min-w-0">{r.name}</span>
              {r.score == null ? (
                <Skeleton width="120px" height="12px" />
              ) : (
                <>
                  <span className="text-[12px] font-mono text-[var(--text-primary)] w-20 text-right">{r.value ?? '—'}</span>
                  <MiniBar score={r.score} />
                  <span className="text-[12px] font-mono text-[var(--text-muted)] w-6 text-right">{r.score}</span>
                  <span className="w-16 text-right"><Tag score={r.score} text={r.tag(r.score)} /></span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
