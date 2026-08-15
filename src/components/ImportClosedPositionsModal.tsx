import { useEffect, useMemo, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { Broker, ClosedPosition, CurrencyCode, Market } from '../types'
import { CURRENCIES, MARKET_LABEL } from '../types'
import { Button, Field, Modal, inputClass } from './ui'
import {
  guessColumnMapping,
  normalizeMarket,
  parseImportFile,
  parseImportNumber,
  CLOSED_COLUMN_ALIASES,
  CLOSED_IMPORT_FIELD_LABEL,
  CLOSED_IMPORT_FIELD_REQUIRED,
  type ClosedImportField,
  type ParsedTable,
} from '../lib/importParser'

const FIELDS: ClosedImportField[] = ['symbol', 'name', 'buyQuantity', 'sellQuantity', 'realizedPnl', 'market', 'lastDate']
const MARKETS: Market[] = ['A', 'HK', 'US', 'DE', 'UK', 'OTHER']

interface ParsedRow {
  index: number
  symbol: string
  name: string
  buyQuantity?: number
  sellQuantity: number
  realizedPnl: number
  market: Market
  lastDate?: string
  valid: boolean
}

function normalizeDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const s = raw.trim()
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  return s
}

export default function ImportClosedPositionsModal({
  open,
  onClose,
  onImport,
  brokers,
  defaultBrokerId,
}: {
  open: boolean
  onClose: () => void
  onImport: (positions: ClosedPosition[]) => void
  brokers: Broker[]
  defaultBrokerId?: string
}) {
  const [table, setTable] = useState<ParsedTable | null>(null)
  const [mapping, setMapping] = useState<Partial<Record<ClosedImportField, number>>>({})
  const [defaultMarket, setDefaultMarket] = useState<Market>('A')
  const [currency, setCurrency] = useState<CurrencyCode>('CNY')
  const [brokerId, setBrokerId] = useState(defaultBrokerId ?? '')
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setBrokerId(defaultBrokerId ?? '')
  }, [open, defaultBrokerId])

  function reset() {
    setTable(null)
    setMapping({})
    setExcluded(new Set())
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)
    try {
      const parsed = await parseImportFile(file)
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        throw new Error('未能从文件中解析出数据,请确认文件包含表头和至少一行记录')
      }
      setTable(parsed)
      setMapping(guessColumnMapping(parsed.headers, CLOSED_COLUMN_ALIASES))
      setExcluded(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : '文件解析失败')
    } finally {
      setLoading(false)
    }
  }

  const parsedRows = useMemo<ParsedRow[]>(() => {
    if (!table) return []
    return table.rows.map((row, index) => {
      const get = (f: ClosedImportField) => (mapping[f] !== undefined ? row[mapping[f] as number] : undefined)
      const symbol = (get('symbol') ?? '').trim()
      const name = (get('name') ?? '').trim()
      const buyRaw = get('buyQuantity')
      const buyQuantity = buyRaw ? parseImportNumber(buyRaw) : undefined
      const sellQuantity = parseImportNumber(get('sellQuantity'))
      const realizedPnl = parseImportNumber(get('realizedPnl'))
      const market = normalizeMarket(get('market')) ?? defaultMarket
      const lastDate = normalizeDate(get('lastDate'))
      const valid = name !== '' && sellQuantity > 0
      return { index, symbol, name, buyQuantity, sellQuantity, realizedPnl, market, lastDate, valid }
    })
  }, [table, mapping, defaultMarket])

  const missingRequired = FIELDS.filter((f) => CLOSED_IMPORT_FIELD_REQUIRED[f] && mapping[f] === undefined)
  const includedRows = parsedRows.filter((r) => r.valid && !excluded.has(r.index))
  const invalidCount = parsedRows.filter((r) => !r.valid).length

  function toggleRow(index: number) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function handleImportClick() {
    const positions: ClosedPosition[] = includedRows.map((r) => ({
      id: uuid(),
      brokerId: brokerId || undefined,
      name: r.name,
      symbol: r.symbol || undefined,
      market: r.market,
      currency,
      buyQuantity: r.buyQuantity,
      sellQuantity: r.sellQuantity,
      realizedPnl: r.realizedPnl,
      lastDate: r.lastDate,
      note: r.symbol ? `导入自文件 · 原始代码 ${r.symbol}` : '导入自文件',
      createdAt: new Date().toISOString(),
    }))
    onImport(positions)
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="导入已清仓记录 (CSV / Excel)" width={780}>
      {!table ? (
        <div>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            适用于已经完全卖出、只是想留一份"赚了多少/亏了多少"记录的股票或基金。至少需要名称、卖出数量、已实现盈亏三列。
          </p>
          <div
            className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--brand)] transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) void handleFile(f)
            }}
          >
            <div className="text-sm font-medium text-[var(--text)]">点击或拖拽文件到此处</div>
            <div className="text-xs text-[var(--text-subtle)] mt-1">支持 .csv .xls .xlsx</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
                e.target.value = ''
              }}
            />
          </div>
          {loading && <div className="text-sm text-[var(--text-muted)] mt-3">解析中…</div>}
          {error && <div className="text-sm text-[var(--down)] mt-3">{error}</div>}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <Field label="默认市场" hint="文件中若有市场列则优先使用">
              <select className={inputClass} value={defaultMarket} onChange={(e) => setDefaultMarket(e.target.value as Market)}>
                {MARKETS.map((m) => (
                  <option key={m} value={m}>
                    {MARKET_LABEL[m]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="币种">
              <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            {brokers.length > 0 && (
              <Field label="导入到目录(可选)" hint="按券商/账户分组">
                <select className={inputClass} value={brokerId} onChange={(e) => setBrokerId(e.target.value)}>
                  <option value="">未分类</option>
                  {brokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <div className="mb-4">
            <div className="text-xs font-medium text-[var(--text-muted)] mb-2">列映射(请确认自动识别是否正确)</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FIELDS.map((f) => (
                <label key={f} className="block">
                  <span className="block text-[11px] text-[var(--text-subtle)] mb-1">
                    {CLOSED_IMPORT_FIELD_LABEL[f]}
                    {CLOSED_IMPORT_FIELD_REQUIRED[f] && <span className="text-[var(--down)]"> *</span>}
                  </span>
                  <select
                    className={inputClass}
                    value={mapping[f] ?? ''}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [f]: e.target.value === '' ? undefined : Number(e.target.value) }))
                    }
                  >
                    <option value="">不导入</option>
                    {table.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `列${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {missingRequired.length > 0 && (
              <div className="text-xs text-[var(--down)] mt-2">
                请为以下必填字段选择对应列:{missingRequired.map((f) => CLOSED_IMPORT_FIELD_LABEL[f]).join('、')}
              </div>
            )}
          </div>

          <div className="mb-3">
            <div className="text-xs font-medium text-[var(--text-muted)] mb-2">
              预览({includedRows.length}/{parsedRows.length} 项将导入{invalidCount > 0 ? `,${invalidCount} 项数据不完整已自动跳过` : ''})
            </div>
            <div className="border border-[var(--border)] rounded-lg overflow-auto max-h-64 scroll-thin">
              <table className="w-full text-xs">
                <thead className="bg-[var(--surface-alt)] sticky top-0">
                  <tr>
                    <th className="p-2 text-left w-8"></th>
                    <th className="p-2 text-left">代码</th>
                    <th className="p-2 text-left">名称</th>
                    <th className="p-2 text-right">买入数量</th>
                    <th className="p-2 text-right">卖出数量</th>
                    <th className="p-2 text-right">已实现盈亏</th>
                    <th className="p-2 text-left">市场</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((r) => (
                    <tr key={r.index} className={`border-t border-[var(--border)] ${!r.valid ? 'opacity-40' : ''}`}>
                      <td className="p-2">
                        <input
                          type="checkbox"
                          disabled={!r.valid}
                          checked={r.valid && !excluded.has(r.index)}
                          onChange={() => toggleRow(r.index)}
                        />
                      </td>
                      <td className="p-2 num">{r.symbol || '—'}</td>
                      <td className="p-2">{r.name || '—'}</td>
                      <td className="p-2 text-right num">{r.buyQuantity ?? '—'}</td>
                      <td className="p-2 text-right num">{r.sellQuantity || '—'}</td>
                      <td className="p-2 text-right num">{r.realizedPnl}</td>
                      <td className="p-2">{MARKET_LABEL[r.market]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="ghost" onClick={reset}>
              重新选择文件
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={handleImportClick} disabled={includedRows.length === 0 || missingRequired.length > 0}>
                导入 {includedRows.length} 项
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
