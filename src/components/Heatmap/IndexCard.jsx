import { formatINR, formatChangePct } from '../../utils/formatters.js'

function getCardBg(pct) {
  if (pct == null) return '#1a1a1a'
  if (pct > 2) return '#1a5c2a'
  if (pct > 1) return '#1a4a22'
  if (pct > 0) return '#143d1a'
  if (pct > -1) return '#3d1414'
  if (pct > -2) return '#5c1a1a'
  return '#7a1a1a'
}

function getPillBg(pct) {
  if (pct == null) return null
  if (Math.abs(pct) < 1.5) return null
  return pct > 0 ? '#27ae60' : '#c0392b'
}

export function IndexCard({ index, quote, onClick }) {
  const pct = quote?.changePct ?? null
  const price = quote?.price ?? null
  const change = quote?.change ?? null
  const { text: changeText } = formatChangePct(pct)
  const cardBg = getCardBg(pct)
  const pillBg = getPillBg(pct)

  return (
    <div
      onClick={() => onClick(index)}
      style={{
        background: cardBg,
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        minHeight: 110,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'filter 0.15s, transform 0.15s',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'scale(1.02)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'scale(1)' }}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.5px', color: '#ccc', textTransform: 'uppercase', fontWeight: 600 }}>
        {index.name}
      </div>

      <div>
        {pillBg && price != null && (
          <div style={{ marginBottom: 4 }}>
            <span style={{
              background: pillBg,
              color: '#fff',
              padding: '2px 10px',
              borderRadius: 6,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              display: 'inline-block'
            }}>
              {price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {!pillBg && price != null && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.2
          }}>
            {price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}

        {pillBg && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 22,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.2
          }}>
            {price != null ? price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
          </div>
        )}

        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
          {change != null ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}` : '—'}
          {pct != null ? ` (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)` : ''}
        </div>
      </div>
    </div>
  )
}
