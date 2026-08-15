import type { AppState } from '../types'

const STORAGE_KEY = 'caiji-folio-state-v1'

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppState
    return { ...parsed, brokers: parsed.brokers ?? [], closedPositions: parsed.closedPositions ?? [] }
  } catch {
    return null
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage full or unavailable; ignore
  }
}

export function defaultState(): AppState {
  return {
    holdings: [],
    dividends: [],
    plans: [],
    snapshots: [],
    settings: {
      baseCurrency: 'CNY',
      fxRates: { CNY: 1 },
    },
    brokers: [],
    closedPositions: [],
  }
}

export function exportStateAsJson(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function importStateFromJson(json: string): AppState {
  const parsed = JSON.parse(json)
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.holdings)) {
    throw new Error('无效的备份文件格式')
  }
  return { ...parsed, brokers: parsed.brokers ?? [], closedPositions: parsed.closedPositions ?? [] } as AppState
}
