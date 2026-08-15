import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppState, Dividend, Holding, PlanExecution, RecurringPlan } from '../types'
import { defaultState, loadState, saveState } from '../lib/storage'
import { upsertTodaySnapshot } from '../lib/calculations'
import { fetchFxRates } from '../lib/quotes'

interface StoreApi {
  state: AppState
  addHolding: (h: Holding) => void
  updateHolding: (h: Holding) => void
  removeHolding: (id: string) => void
  addDividend: (d: Dividend) => void
  removeDividend: (id: string) => void
  addPlan: (p: RecurringPlan) => void
  updatePlan: (p: RecurringPlan) => void
  removePlan: (id: string) => void
  executePlan: (planId: string, execution: PlanExecution, newQuantity: number, newCostPrice: number) => void
  setBaseCurrency: (currency: string) => void
  refreshFxRates: () => Promise<void>
  replaceState: (next: AppState) => void
  resetState: () => void
}

const StoreContext = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState() ?? defaultState())
  const didInitFx = useRef(false)

  useEffect(() => {
    saveState(state)
  }, [state])

  // Record a snapshot for today whenever holdings/settings change (for the trend chart).
  useEffect(() => {
    setState((prev) => {
      const snapshots = upsertTodaySnapshot(prev.snapshots, prev.holdings, prev.settings)
      if (snapshots === prev.snapshots) return prev
      return { ...prev, snapshots }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.holdings, state.settings.baseCurrency, state.settings.fxRates])

  const refreshFxRates = useCallback(async () => {
    const base = state.settings.baseCurrency
    try {
      const rates = await fetchFxRates(base)
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, fxRates: rates, fxUpdatedAt: new Date().toISOString() },
      }))
    } catch {
      // keep last known rates
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings.baseCurrency])

  useEffect(() => {
    if (didInitFx.current) return
    didInitFx.current = true
    void refreshFxRates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const api = useMemo<StoreApi>(
    () => ({
      state,
      addHolding: (h) => setState((prev) => ({ ...prev, holdings: [...prev.holdings, h] })),
      updateHolding: (h) =>
        setState((prev) => ({ ...prev, holdings: prev.holdings.map((x) => (x.id === h.id ? h : x)) })),
      removeHolding: (id) => setState((prev) => ({ ...prev, holdings: prev.holdings.filter((x) => x.id !== id) })),
      addDividend: (d) => setState((prev) => ({ ...prev, dividends: [...prev.dividends, d] })),
      removeDividend: (id) =>
        setState((prev) => ({ ...prev, dividends: prev.dividends.filter((x) => x.id !== id) })),
      addPlan: (p) => setState((prev) => ({ ...prev, plans: [...prev.plans, p] })),
      updatePlan: (p) => setState((prev) => ({ ...prev, plans: prev.plans.map((x) => (x.id === p.id ? p : x)) })),
      removePlan: (id) => setState((prev) => ({ ...prev, plans: prev.plans.filter((x) => x.id !== id) })),
      executePlan: (planId, execution, newQuantity, newCostPrice) =>
        setState((prev) => ({
          ...prev,
          plans: prev.plans.map((p) =>
            p.id === planId ? { ...p, history: [...p.history, execution], nextDate: nextDateAfter(p) } : p,
          ),
          holdings: prev.holdings.map((h) =>
            h.id === prev.plans.find((p) => p.id === planId)?.holdingId
              ? { ...h, quantity: newQuantity, costPrice: newCostPrice }
              : h,
          ),
        })),
      setBaseCurrency: (currency) =>
        setState((prev) => ({ ...prev, settings: { ...prev.settings, baseCurrency: currency as never } })),
      refreshFxRates,
      replaceState: (next) => setState(next),
      resetState: () => setState(defaultState()),
    }),
    [state, refreshFxRates],
  )

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

function nextDateAfter(p: RecurringPlan): string {
  const d = new Date(p.nextDate)
  if (p.frequency === 'weekly') d.setDate(d.getDate() + 7)
  else if (p.frequency === 'biweekly') d.setDate(d.getDate() + 14)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
