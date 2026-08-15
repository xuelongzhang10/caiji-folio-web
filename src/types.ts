export type AssetClass = 'stock' | 'fund' | 'gold' | 'cash' | 'custom'

export type Market = 'A' | 'HK' | 'US' | 'DE' | 'UK' | 'OTHER'

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  stock: '股票',
  fund: '基金',
  gold: '黄金',
  cash: '现金',
  custom: '自定义资产',
}

export const MARKET_LABEL: Record<Market, string> = {
  A: 'A股',
  HK: '港股',
  US: '美股',
  DE: '德股',
  UK: '英股',
  OTHER: '其他',
}

export const CURRENCIES = ['CNY', 'HKD', 'USD', 'EUR', 'GBP'] as const
export type CurrencyCode = (typeof CURRENCIES)[number]

export interface Holding {
  id: string
  assetClass: AssetClass
  name: string
  symbol?: string
  market?: Market
  quantity: number
  costPrice: number
  currency: CurrencyCode
  currentPrice?: number
  priceUpdatedAt?: string
  priceSource: 'manual' | 'api'
  note?: string
  createdAt: string
}

export interface Dividend {
  id: string
  holdingId?: string
  name: string
  amount: number
  currency: CurrencyCode
  date: string
  note?: string
}

export type PlanFrequency = 'weekly' | 'biweekly' | 'monthly'

export interface PlanExecution {
  id: string
  date: string
  amount: number
  price: number
  quantity: number
}

export interface RecurringPlan {
  id: string
  holdingId: string
  name: string
  amount: number
  frequency: PlanFrequency
  dayOfMonth?: number
  weekday?: number
  nextDate: string
  active: boolean
  history: PlanExecution[]
  createdAt: string
}

export interface Snapshot {
  date: string
  totalValueBase: number
  byAssetClass: Partial<Record<AssetClass, number>>
}

export interface Settings {
  baseCurrency: CurrencyCode
  fxRates: Record<string, number>
  fxUpdatedAt?: string
}

export interface AppState {
  holdings: Holding[]
  dividends: Dividend[]
  plans: RecurringPlan[]
  snapshots: Snapshot[]
  settings: Settings
}
