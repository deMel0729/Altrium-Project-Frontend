const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const formatMoney = (value) => currency.format(Number(value) || 0)
export const formatMoneyCompact = (value) => compactCurrency.format(Number(value) || 0)

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

// <input type="date"> needs a plain yyyy-mm-dd string, not an ISO timestamp.
export function toDateInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Sent without a timezone suffix on purpose. `.toISOString()` would shift the
// day for anyone east of UTC (a picked 30 Nov becomes 29 Nov 18:30Z in IST),
// and the C# DateTime binder reads an unqualified string as the literal date.
export function fromDateInput(value) {
  if (!value) return null
  return `${value}T00:00:00`
}

export const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

export function daysUntil(value) {
  if (!value) return null
  const due = new Date(value)
  if (Number.isNaN(due.getTime())) return null
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.round((due - startOfToday) / 86_400_000)
}

export function relativeDueLabel(value) {
  const days = daysUntil(value)
  if (days === null) return '—'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return days < 0 ? `${Math.abs(days)} days overdue` : `In ${days} days`
}

export const initials = (name) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
