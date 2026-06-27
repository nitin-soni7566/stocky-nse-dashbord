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

exports.handler = async () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const day = now.getDay()
  const dateStr = now.toISOString().split('T')[0]
  const totalMinutes = now.getHours() * 60 + now.getMinutes()

  const isWeekend = day === 0 || day === 6
  const isHoliday = NSE_HOLIDAYS.has(dateStr)
  const isPreOpen = totalMinutes >= 9 * 60 && totalMinutes < 9 * 60 + 15
  const isOpen = totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 30

  let session = 'closed'
  if (!isWeekend && !isHoliday) {
    if (isPreOpen) session = 'pre-open'
    else if (isOpen) session = 'open'
  }

  const nextOpenDate = new Date(now)
  if (totalMinutes >= 15 * 60 + 30 || isWeekend || isHoliday) {
    nextOpenDate.setDate(nextOpenDate.getDate() + 1)
    while (nextOpenDate.getDay() === 0 || nextOpenDate.getDay() === 6 ||
           NSE_HOLIDAYS.has(nextOpenDate.toISOString().split('T')[0])) {
      nextOpenDate.setDate(nextOpenDate.getDate() + 1)
    }
  }
  nextOpenDate.setHours(9, 15, 0, 0)
  const nextCloseDate = new Date(nextOpenDate)
  nextCloseDate.setHours(15, 30, 0, 0)

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      isOpen: session === 'open',
      session,
      nextOpen: nextOpenDate.toISOString(),
      nextClose: nextCloseDate.toISOString()
    })
  }
}
