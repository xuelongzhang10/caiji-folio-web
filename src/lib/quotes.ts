// Public, key-free data sources for FX rates and market quotes.
// Real-time stock/fund quoting from a pure-frontend static site is inherently
// best-effort: browsers enforce CORS, and Yahoo Finance's endpoints don't
// send CORS headers, so we go through a public read-only CORS relay. If every
// relay fails (offline, relay down, rate-limited), callers fall back to the
// holding's last manually-entered price.

const YAHOO_CHART_URL = (symbol: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`

const CORS_RELAYS = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://proxy.cors.sh/${url}`,
]

async function fetchJsonThroughRelay(targetUrl: string): Promise<unknown> {
  let lastError: unknown
  for (const relay of CORS_RELAYS) {
    try {
      const res = await fetch(relay(targetUrl), { signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      lastError = err
    }
  }
  throw lastError ?? new Error('所有行情代理均不可用')
}

export interface QuoteResult {
  symbol: string
  price: number
  currency: string
  updatedAt: string
}

/**
 * Yahoo Finance requires an exchange suffix for A-shares (.SS/.SZ) and doesn't
 * recognize the ".SH" suffix common on Chinese finance sites. Auto-correct
 * these so a bare code like "601318" or "601318.SH" still resolves.
 */
function normalizeSymbol(symbol: string): string {
  const s = symbol.trim()
  if (/^\d{6}$/.test(s)) {
    if (/^(60|68|90)/.test(s)) return `${s}.SS`
    if (/^(00|30|20)/.test(s)) return `${s}.SZ`
    return s
  }
  if (/^\d{6}\.SH$/i.test(s)) return `${s.slice(0, 6)}.SS`
  return s
}

/** Fetch latest price for a Yahoo-style ticker, e.g. AAPL, 0700.HK, 600519.SS, SAP.DE, HSBA.L, XAUUSD=X */
export async function fetchQuote(symbol: string): Promise<QuoteResult> {
  const data = (await fetchJsonThroughRelay(YAHOO_CHART_URL(normalizeSymbol(symbol)))) as {
    chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; currency?: string } }>; error?: unknown }
  }
  const result = data.chart?.result?.[0]
  const price = result?.meta?.regularMarketPrice
  if (!result || typeof price !== 'number') {
    throw new Error('未能获取有效行情数据')
  }
  return {
    symbol,
    price,
    currency: result.meta?.currency ?? 'USD',
    updatedAt: new Date().toISOString(),
  }
}

export async function fetchQuotesBatch(symbols: string[]): Promise<Map<string, QuoteResult | Error>> {
  const entries = await Promise.all(
    symbols.map(async (s): Promise<[string, QuoteResult | Error]> => {
      try {
        return [s, await fetchQuote(s)]
      } catch (err) {
        return [s, err instanceof Error ? err : new Error('获取失败')]
      }
    }),
  )
  return new Map<string, QuoteResult | Error>(entries)
}

/** Frankfurter (ECB reference rates) — free, no key, CORS-enabled. */
export async function fetchFxRates(base: string): Promise<Record<string, number>> {
  const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { rates?: Record<string, number> }
  return { [base]: 1, ...(data.rates ?? {}) }
}

/** Suggests a default Yahoo-style ticker suffix for a stock market, purely as UX help. */
export const MARKET_SYMBOL_HINT: Record<string, string> = {
  A: '如 600519.SS(沪) / 000001.SZ(深)',
  HK: '如 0700.HK',
  US: '如 AAPL',
  DE: '如 SAP.DE',
  UK: '如 HSBA.L',
  OTHER: '',
}

export const GOLD_SYMBOL = 'GC=F'
