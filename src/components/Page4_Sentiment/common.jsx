// Shared helpers for the Market Sentiment page.

// Visible index order (top → bottom / left → right). GIFT NIFTY is unavailable on
// Upstox and is filtered out at render time (its price is always null).
export const VISIBLE_INDICES = [
  { name: 'giftNifty', label: 'GIFT NIFTY' },
  { name: 'nifty50',   label: 'NIFTY 50' },
  { name: 'bankNifty', label: 'BANK NIFTY' },
  { name: 'sensex',    label: 'SENSEX' },
  { name: 'indiaVix',  label: 'INDIA VIX' }
]

export const GREEN = '#00C853'
export const RED = '#E53935'
export const GREY = '#888888'

// VIX is inverted: rising VIX = more fear = red; falling VIX = green.
export function changeColor(name, changePct) {
  if (changePct == null) return GREY
  if (name === 'indiaVix') return changePct > 0 ? RED : changePct < 0 ? GREEN : GREY
  return changePct > 0 ? GREEN : changePct < 0 ? RED : GREY
}

export function fmtNum(n, dp = 2) {
  if (n == null || isNaN(n)) return '—'
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n)
}

// Signed number for change / change%. Snaps near-zero (incl. -0) to a clean "0.00"
// so a flat index never renders as "-0.00".
export function fmtSigned(n, dp = 2) {
  if (n == null || isNaN(n)) return '—'
  const r = Math.abs(n) < 0.005 ? 0 : n
  return `${r > 0 ? '+' : ''}${fmtNum(r, dp)}`
}

// Inline SVG arrows (never emoji). `up` chooses direction; inherits currentColor.
export function Arrow({ up, size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" style={{ display: 'inline-block', verticalAlign: 'middle' }} aria-hidden="true">
      <path d={up ? 'M2 8 L5 2 L8 8' : 'M2 2 L5 8 L8 2'} stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// VIX zone by value (not change direction).
export function vixZone(v) {
  if (v == null) return { label: '', color: GREY, gradient: 'linear-gradient(135deg, #141414, #1c1c1c)' }
  if (v < 12)  return { label: 'VERY CALM', color: '#818cf8', gradient: 'linear-gradient(135deg, #0d0d1f, #1a1a3a)' }
  if (v < 15)  return { label: 'NORMAL',    color: '#4ade80', gradient: 'linear-gradient(135deg, #0d1f12, #1a3a20)' }
  if (v < 20)  return { label: 'CAUTIOUS',  color: '#f59e0b', gradient: 'linear-gradient(135deg, #1f1a0d, #3a300d)' }
  if (v < 25)  return { label: 'FEARFUL',   color: '#f97316', gradient: 'linear-gradient(135deg, #1f150d, #3a200d)' }
  return { label: 'PANIC', color: RED, gradient: 'linear-gradient(135deg, #1f0d0d, #3a1a1a)' }
}

// Card background gradient by change sign (for non-VIX indices).
export function cardGradient(changePct) {
  if (changePct > 0) return 'linear-gradient(135deg, #0d1f12, #1a3a20)'
  if (changePct < 0) return 'linear-gradient(135deg, #1f0d0d, #3a1a1a)'
  return 'linear-gradient(135deg, #141414, #1c1c1c)'
}
