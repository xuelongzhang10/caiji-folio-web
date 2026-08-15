const CURRENCY_SYMBOL: Record<string, string> = {
  CNY: '¥',
  HKD: 'HK$',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

export function formatMoney(value: number, currency = 'CNY'): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency + ' '
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${value < 0 ? '-' : ''}${symbol}${formatted}`
}

export function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: digits })
}

export function formatPercent(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}
