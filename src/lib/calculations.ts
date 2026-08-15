import type { AssetClass, Holding, Settings, Snapshot } from '../types'
import { ASSET_CLASS_LABEL } from '../types'
import { todayStr } from './format'

/** Convert an amount in `fromCurrency` to `settings.baseCurrency`.
 * settings.fxRates[cur] = units of `cur` per 1 unit of baseCurrency (Frankfurter convention). */
export function convertToBase(amount: number, fromCurrency: string, settings: Settings): number {
  if (fromCurrency === settings.baseCurrency) return amount
  const rate = settings.fxRates[fromCurrency]
  if (!rate) return amount // no rate known, treat as 1:1 fallback
  return amount / rate
}

export function convert(amount: number, fromCurrency: string, toCurrency: string, settings: Settings): number {
  if (fromCurrency === toCurrency) return amount
  const base = convertToBase(amount, fromCurrency, settings)
  if (toCurrency === settings.baseCurrency) return base
  const rate = settings.fxRates[toCurrency]
  if (!rate) return base
  return base * rate
}

export function holdingUnitPrice(h: Holding): number {
  return h.currentPrice ?? h.costPrice
}

export function holdingMarketValue(h: Holding): number {
  return h.quantity * holdingUnitPrice(h)
}

export function holdingCostValue(h: Holding): number {
  return h.quantity * h.costPrice
}

export function holdingMarketValueBase(h: Holding, settings: Settings): number {
  return convertToBase(holdingMarketValue(h), h.currency, settings)
}

export function holdingCostValueBase(h: Holding, settings: Settings): number {
  return convertToBase(holdingCostValue(h), h.currency, settings)
}

export function holdingPnl(h: Holding): number {
  return holdingMarketValue(h) - holdingCostValue(h)
}

export function holdingPnlPercent(h: Holding): number {
  const cost = holdingCostValue(h)
  if (cost === 0) return 0
  return (holdingPnl(h) / cost) * 100
}

export function portfolioTotalBase(holdings: Holding[], settings: Settings): number {
  return holdings.reduce((sum, h) => sum + holdingMarketValueBase(h, settings), 0)
}

export function portfolioCostBase(holdings: Holding[], settings: Settings): number {
  return holdings.reduce((sum, h) => sum + holdingCostValueBase(h, settings), 0)
}

export interface AllocationSlice {
  assetClass: AssetClass
  label: string
  valueBase: number
  percent: number
}

export function allocationByClass(holdings: Holding[], settings: Settings): AllocationSlice[] {
  const total = portfolioTotalBase(holdings, settings)
  const byClass = new Map<AssetClass, number>()
  for (const h of holdings) {
    const v = holdingMarketValueBase(h, settings)
    byClass.set(h.assetClass, (byClass.get(h.assetClass) ?? 0) + v)
  }
  return Array.from(byClass.entries())
    .map(([assetClass, valueBase]) => ({
      assetClass,
      label: ASSET_CLASS_LABEL[assetClass],
      valueBase,
      percent: total > 0 ? (valueBase / total) * 100 : 0,
    }))
    .sort((a, b) => b.valueBase - a.valueBase)
}

export function buildTodaySnapshot(holdings: Holding[], settings: Settings): Snapshot {
  const byAssetClass: Partial<Record<AssetClass, number>> = {}
  for (const slice of allocationByClass(holdings, settings)) {
    byAssetClass[slice.assetClass] = slice.valueBase
  }
  return {
    date: todayStr(),
    totalValueBase: portfolioTotalBase(holdings, settings),
    byAssetClass,
  }
}

export function upsertTodaySnapshot(snapshots: Snapshot[], holdings: Holding[], settings: Settings): Snapshot[] {
  const today = buildTodaySnapshot(holdings, settings)
  const idx = snapshots.findIndex((s) => s.date === today.date)
  if (idx === -1) return [...snapshots, today].sort((a, b) => a.date.localeCompare(b.date))
  const next = [...snapshots]
  next[idx] = today
  return next
}
