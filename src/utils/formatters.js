export function formatINR(number) {
  if (number == null || isNaN(number)) return '₹—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number)
}

export function formatVolume(number) {
  if (number == null || isNaN(number)) return '—'
  if (number < 1_00_000) return `${(number / 1000).toFixed(1)}K`
  if (number < 1_00_00_000) return `${(number / 1_00_000).toFixed(1)}L`
  return `${(number / 1_00_00_000).toFixed(1)}Cr`
}

export function formatChange(value, isPercent = false) {
  if (value == null || isNaN(value)) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}${isPercent ? '%' : ''}`
}

export function formatChangePct(value) {
  if (value == null || isNaN(value)) return { text: '—', color: '#888888' }
  if (value > 0) return { text: `▲ +${value.toFixed(2)}%`, color: '#00C853' }
  if (value < 0) return { text: `▼ ${value.toFixed(2)}%`, color: '#FF3D3D' }
  return { text: '— 0.00%', color: '#888888' }
}

export function formatCrore(value) {
  if (value == null || isNaN(value)) return '—'
  const a = Math.abs(value)
  if (a >= 10000) return (value / 10000).toFixed(2) + 'Cr'
  if (a >= 100) return (value / 100).toFixed(2) + 'L'
  return value.toFixed(2) + 'Cr'
}

export function formatTime(date) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date instanceof Date ? date : new Date(date))
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date instanceof Date ? date : new Date(date))
}
