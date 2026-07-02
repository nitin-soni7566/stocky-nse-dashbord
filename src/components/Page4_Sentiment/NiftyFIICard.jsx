import { useState } from 'react'
import { Skeleton } from '../UI/Skeleton.jsx'
import { formatDate } from '../../utils/formatters.js'
import { fmtNum, fmtSigned, GREEN, RED, GREY } from './common.jsx'

function Sparkline({ closes }) {
  if (!closes || closes.length < 2) return <Skeleton width="130px" height="52px" />
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const span = max - min || 1
  const n = closes.length
  const getX = i => 5 + (i / (n - 1)) * 120
  const getY = v => 48 - ((v - min) / span) * 40 + 2
  const pts = closes.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ')
  return (
    <svg width="130" height="52" viewBox="0 0 130 52" style={{ flexShrink: 0 }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={GREY} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {closes.map((v, i) => <circle key={i} cx={getX(i)} cy={getY(v)} r="3" fill={GREY} />)}
    </svg>
  )
}

function FiiBars({ fiiData }) {
  if (!fiiData?.length) return <Skeleton width="130px" height="44px" />
  const days = fiiData.slice(0, 10).reverse()   // oldest → newest, left → right
  const maxNet = Math.max(...days.map(d => Math.abs(d.net)), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 44, minWidth: 60 }}>
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center justify-end" style={{ height: '100%' }}>
          <div style={{
            width: 12,
            minWidth: 12,
            height: (Math.abs(d.net) / maxNet) * 36 + 4,
            borderRadius: '2px 2px 0 0',
            background: d.net >= 0 ? '#1a5c2a' : '#7a1a1a'
          }} />
          <span style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{d.displayDate}</span>
        </div>
      ))}
    </div>
  )
}

export function NiftyFIICard({ indices, niftyHistory, sensexHistory, fiiData, fiiError }) {
  const [tab, setTab] = useState('nifty')
  const idx = tab === 'nifty' ? indices.nifty50 : indices.sensex
  const closes = tab === 'nifty' ? niftyHistory : sensexHistory
  const lastFii = fiiData?.[0] ?? null
  const changePositive = (idx?.change ?? 0) >= 0

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 flex flex-col">
      {/* Tabs */}
      <div className="flex gap-4 mb-3">
        {[['nifty', 'NIFTY'], ['sensex', 'SENSEX']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="text-[13px] pb-1 transition-colors"
            style={tab === key
              ? { fontWeight: 600, color: 'var(--text-primary)', borderBottom: '2px solid currentColor' }
              : { color: 'var(--text-muted)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Price + sparkline */}
      <div className="flex items-center justify-between gap-3">
        <div>
          {idx?.price == null ? (
            <Skeleton width="140px" height="24px" />
          ) : (
            <div className="text-[22px] font-mono text-[var(--text-primary)] leading-tight">
              {fmtNum(idx.price)}{' '}
              <span className="text-[15px]" style={{ color: changePositive ? GREEN : RED }}>
                ({fmtSigned(idx.change)})
              </span>
            </div>
          )}
          <div className="text-[12px] text-[var(--text-muted)] mt-1">{formatDate(new Date())}</div>
        </div>
        <Sparkline closes={closes} />
      </div>

      <div style={{ borderTop: '0.5px solid var(--border)', margin: '12px 0' }} />

      {/* FII cash */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium text-[var(--text-secondary)]">FII Cash</div>
          {fiiError || !lastFii ? (
            <div className="text-[13px] text-[var(--text-muted)] mt-1">FII data unavailable today</div>
          ) : (
            <>
              <div className="text-[20px] font-mono mt-0.5" style={{ color: lastFii.net >= 0 ? GREEN : RED }}>
                {lastFii.net >= 0 ? '+' : '-'}{fmtNum(Math.abs(lastFii.net))} Cr.
              </div>
              <div className="text-[12px] text-[var(--text-muted)]">{lastFii.date?.replace(/-/g, ' ')}</div>
            </>
          )}
        </div>
        {!fiiError && lastFii && <FiiBars fiiData={fiiData} />}
      </div>
    </div>
  )
}
