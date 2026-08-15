import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { Market } from '../types'

export interface ParsedTable {
  headers: string[]
  rows: string[][]
}

export type ImportField = 'symbol' | 'name' | 'quantity' | 'costPrice' | 'currentPrice' | 'market'

export const IMPORT_FIELD_LABEL: Record<ImportField, string> = {
  symbol: '证券代码',
  name: '证券名称',
  quantity: '持仓数量',
  costPrice: '成本价',
  currentPrice: '现价(可选)',
  market: '交易市场(可选)',
}

export const IMPORT_FIELD_REQUIRED: Record<ImportField, boolean> = {
  symbol: true,
  name: true,
  quantity: true,
  costPrice: true,
  currentPrice: false,
  market: false,
}

// Common header text used by 同花顺 / 东方财富 / 中信证券等国内券商软件导出的持仓文件。
export const COLUMN_ALIASES: Record<ImportField, string[]> = {
  symbol: ['证券代码', '股票代码', '基金代码', '代码', '证券编号', 'symbol', 'code'],
  name: ['证券名称', '股票名称', '基金名称', '名称', 'name'],
  quantity: ['证券数量', '股票余额', '基金份额', '持仓数量', '股份余额', '持仓股数', '数量', 'quantity'],
  costPrice: ['成本价', '摊薄成本价', '参考成本价', '成本单价', '持仓成本价', '成本', 'cost'],
  currentPrice: ['现价', '最新价', '市价', '当前价', '最新价格', 'price'],
  market: ['交易市场', '市场', '交易所', 'market'],
}

export type ClosedImportField = 'symbol' | 'name' | 'buyQuantity' | 'sellQuantity' | 'realizedPnl' | 'market' | 'lastDate'

export const CLOSED_IMPORT_FIELD_LABEL: Record<ClosedImportField, string> = {
  symbol: '证券代码(可选)',
  name: '证券名称',
  buyQuantity: '累计买入数量(可选)',
  sellQuantity: '累计卖出数量',
  realizedPnl: '已实现盈亏',
  market: '交易市场(可选)',
  lastDate: '最后交易日期(可选)',
}

export const CLOSED_IMPORT_FIELD_REQUIRED: Record<ClosedImportField, boolean> = {
  symbol: false,
  name: true,
  buyQuantity: false,
  sellQuantity: true,
  realizedPnl: true,
  market: false,
  lastDate: false,
}

export const CLOSED_COLUMN_ALIASES: Record<ClosedImportField, string[]> = {
  symbol: ['证券代码', '股票代码', '代码', 'symbol', 'code'],
  name: ['证券名称', '股票名称', '名称', 'name'],
  buyQuantity: ['累计买入数量', '买入数量', '买入股数'],
  sellQuantity: ['累计卖出数量', '卖出数量', '卖出股数', '清仓数量'],
  realizedPnl: ['已实现盈亏(cny)', '已实现盈亏', '实现盈亏', '盈亏'],
  market: ['交易市场', '市场', '交易所', 'market'],
  lastDate: ['最后卖出日期', '最后交易日期', '卖出日期', '清仓日期', 'date'],
}

/** Read a File (.csv/.xls/.xlsx) into a plain header+rows table. */
export async function parseImportFile(file: File): Promise<ParsedTable> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseExcel(file)
  }
  return parseCsv(file)
}

async function parseExcel(file: File): Promise<ParsedTable> {
  const buf = await file.arrayBuffer()
  const workbook = XLSX.read(buf, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' })
  const rows = grid.map((r) => r.map((c) => String(c ?? '').trim()))
  return splitHeaderRows(rows)
}

async function parseCsv(file: File): Promise<ParsedTable> {
  const buf = await file.arrayBuffer()
  const text = decodeCsvBytes(buf)
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true })
  const rows = result.data.map((r) => r.map((c) => String(c ?? '').trim()))
  return splitHeaderRows(rows)
}

function splitHeaderRows(rows: string[][]): ParsedTable {
  const nonEmpty = rows.filter((r) => r.some((c) => c !== ''))
  const [headers, ...rest] = nonEmpty
  return { headers: headers ?? [], rows: rest }
}

/** 国内券商软件导出的 CSV 常为 GBK 编码,浏览器默认按 UTF-8 解码会乱码,这里做自动探测。 */
function decodeCsvBytes(buf: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('gbk').decode(buf)
  }
}

export function guessColumnMapping<F extends string>(
  headers: string[],
  aliasMap: Record<F, string[]>,
): Partial<Record<F, number>> {
  const mapping: Partial<Record<F, number>> = {}
  const normalized = headers.map((h) => h.trim().toLowerCase())
  for (const field of Object.keys(aliasMap) as F[]) {
    const aliases = aliasMap[field].map((a) => a.toLowerCase())
    const idx = normalized.findIndex((h) => aliases.some((a) => h === a || h.includes(a)))
    if (idx !== -1) mapping[field] = idx
  }
  return mapping
}

export function parseImportNumber(raw: string | undefined): number {
  if (!raw) return 0
  const cleaned = raw.replace(/[,，%\s]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

const MARKET_KEYWORDS: [RegExp, Market][] = [
  [/沪|上证|上海|^sh$/i, 'A'],
  [/深|深证|^sz$/i, 'A'],
  [/北交|^bj$/i, 'A'],
  [/港|hk|hongkong/i, 'HK'],
  [/美|us|nasdaq|nyse|纳斯达克|纽交所/i, 'US'],
  [/德|frankfurt|xetra/i, 'DE'],
  [/英|london|lse/i, 'UK'],
]

export function normalizeMarket(raw: string | undefined): Market | undefined {
  if (!raw) return undefined
  for (const [re, market] of MARKET_KEYWORDS) {
    if (re.test(raw)) return market
  }
  return undefined
}

/** 尝试把 A 股 6 位代码转换成雅虎财经行情接口可用的代码,便于导入后继续用"刷新行情"功能。 */
export function guessYahooSymbolForAShare(rawCode: string): string | undefined {
  const digits = rawCode.replace(/\D/g, '')
  if (digits.length !== 6) return undefined
  if (digits.startsWith('6')) return `${digits}.SS`
  if (digits.startsWith('0') || digits.startsWith('3')) return `${digits}.SZ`
  return undefined
}
