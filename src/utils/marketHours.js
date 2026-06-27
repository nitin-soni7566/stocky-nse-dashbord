const NSE_HOLIDAYS = new Set([
  '2025-01-14', '2025-02-19', '2025-02-26', '2025-03-14',
  '2025-03-31', '2025-04-10', '2025-04-14', '2025-04-18',
  '2025-05-01', '2025-08-15', '2025-08-27', '2025-10-02',
  '2025-10-21', '2025-10-22', '2025-11-05', '2025-11-15',
  '2025-12-25',
  '2026-01-14', '2026-01-26', '2026-03-05', '2026-03-20',
  '2026-03-25', '2026-04-02', '2026-04-03', '2026-04-14',
  '2026-05-01', '2026-07-17', '2026-08-15', '2026-10-02',
  '2026-10-20', '2026-11-04', '2026-12-25'
])

function getIST() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
}

export function isMarketOpen() {
  const now = getIST()
  const day = now.getDay()
  const dateStr = now.toISOString().split('T')[0]
  if (day === 0 || day === 6 || NSE_HOLIDAYS.has(dateStr)) return false
  const mins = now.getHours() * 60 + now.getMinutes()
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30
}

export function getMarketSession() {
  const now = getIST()
  const day = now.getDay()
  const dateStr = now.toISOString().split('T')[0]
  if (day === 0 || day === 6 || NSE_HOLIDAYS.has(dateStr)) return 'closed'
  const mins = now.getHours() * 60 + now.getMinutes()
  if (mins >= 9 * 60 && mins < 9 * 60 + 15) return 'pre-open'
  if (mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30) return 'open'
  return 'closed'
}
