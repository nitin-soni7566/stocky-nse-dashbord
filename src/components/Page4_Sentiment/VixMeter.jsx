import { Skeleton } from '../UI/Skeleton.jsx'
import { fmtNum, fmtSigned, vixZone, changeColor } from './common.jsx'

const ZONES = [
  { label: 'Calm <12' }, { label: 'Normal 12–15' }, { label: 'Caution 15–20' }, { label: 'Fear 20–25' }, { label: 'Panic >25' }
]

function StatBox({ label, value }) {
  return (
    <div className="flex-1 text-center rounded-lg py-2 px-1" style={{ background: 'var(--bg-secondary)' }}>
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
      <div className="text-[14px] font-mono text-[var(--text-primary)] mt-0.5">{value}</div>
    </div>
  )
}

export function VixMeter({ indices, vixStats }) {
  const vix = indices.indiaVix
  const zone = vixZone(vix?.price)
  const needlePct = vix?.price != null ? Math.min(98, Math.max(2, ((vix.price - 10) / (30 - 10)) * 100)) : 50
  const changeColorVal = changeColor('indiaVix', vix?.changePct)

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">India VIX — fear meter</h3>

      {vix?.loading ? (
        <Skeleton width="120px" height="28px" />
      ) : vix?.error || vix?.price == null ? (
        <div className="text-sm text-[var(--text-secondary)]">Unable to load India VIX</div>
      ) : (
        <>
          <div className="flex items-end gap-3">
            <span className="text-[28px] font-mono leading-none" style={{ color: '#f0f0f0' }}>{fmtNum(vix.price)}</span>
            <span className="text-[12px] font-semibold pb-1" style={{ color: zone.color }}>{zone.label} zone</span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">↓ Lower VIX = Less Fear</div>

          {/* Zone gradient bar with needle */}
          <div className="mt-4" style={{ position: 'relative', height: 10, borderRadius: 5,
            background: 'linear-gradient(to right, #1e3a5f 0%, #1a5c2a 20%, #5c5c00 40%, #7a3a00 65%, #7a1a1a 100%)' }}>
            <div style={{ position: 'absolute', top: -3, left: `${needlePct}%`, width: 3, height: 16,
              background: '#f0f0f0', borderRadius: 2, transform: 'translateX(-50%)', transition: 'left 0.8s ease-in-out' }} />
          </div>
          <div className="flex justify-between mt-1.5">
            {ZONES.map(z => <span key={z.label} className="text-[9px] text-[var(--text-muted)]">{z.label}</span>)}
          </div>

          {/* Stat boxes */}
          <div className="flex gap-2 mt-4">
            <StatBox label="52W High" value={vixStats?.high52 != null ? fmtNum(vixStats.high52) : '—'} />
            <StatBox label="52W Low" value={vixStats?.low52 != null ? fmtNum(vixStats.low52) : '—'} />
            <StatBox label="Today" value={<span style={{ color: changeColorVal }}>{fmtSigned(vix.changePct)}%</span>} />
          </div>
        </>
      )}
    </div>
  )
}
