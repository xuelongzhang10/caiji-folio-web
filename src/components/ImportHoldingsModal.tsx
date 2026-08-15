import { useMemo, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { AssetClass, CurrencyCode, Holding, Market } from '../types'
import { CURRENCIES, MARKET_LABEL } from '../types'
import { Button, Field, Modal, inputClass } from './ui'
import {
  guessColumnMapping,
  guessYahooSymbolForAShare,
  normalizeMarket,
  parseImportFile,
  parseImportNumber,
  IMPORT_FIELD_LABEL,
  IMPORT_FIELD_REQUIRED,
  type ImportField,
  type ParsedTable,
} from '../lib/importParser'

const FIELDS: ImportField[] = ['symbol', 'name', 'quantity', 'costPrice', 'currentPrice', 'market']
const MARKETS: Market[] = ['A', 'HK', 'US', 'DE', 'UK', 'OTHER']

interface ParsedRow {
  index: number
  symbol: string
  name: string
  quantity: number
  costPrice: number
  currentPrice?: number
  market: Market
  valid: boolean
}

export default function ImportHoldingsModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean
  onClose: () => void
  onImport: (holdings: Holding[], mergeMode: boolean) => void
}) {
  const [table, setTable] = useState<ParsedTable | null>(null)
  const [mapping, setMapping] = useState<Partial<Record<ImportField, number>>>({})
  const [assetClass, setAssetClass] = useState<AssetClass>('stock')
  const [defaultMarket, setDefaultMarket] = useState<Market>('A')
  const [currency, setCurrency] = useState<CurrencyCode>('CNY')
  const [mergeMode, setMergeMode] = useState(true)
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        throw new Error('未能从文件中解析出数据,请确认文件包含表头和至少一行持仓数据')
      }
      setTable(parsed)
      setMapping(guessColumnMapping(parsed.headers))
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
      const get = (f: ImportField) => (mapping[f] !== undefined ? row[mapping[f] as number] : undefined)
      const symbol = (get('symbol') ?? '').trim()
      const name = (get('name') ?? '').trim()
      const quantity = parseImportNumber(get('quantity'))
      const costPrice = parseImportNumber(get('costPrice'))
      const currentRaw = get('currentPrice')
      const currentPrice = currentRaw ? parseImportNumber(currentRaw) : undefined
      const market = normalizeMarket(get('market')) ?? defaultMarket
      const valid = name !== '' && quantity > 0 && costPrice >= 0
      return { index, symbol, name, quantity, costPrice, currentPrice, market, valid }
    })
  }, [table, mapping, defaultMarket])

  const missingRequired = FIELDS.filter((f) => IMPORT_FIELD_REQUIRED[f] && mapping[f] === undefined)
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
    const holdings: Holding[] = includedRows.map((r) => {
      const symbol =
        assetClass === 'stock' && r.market === 'A' && r.symbol ? (guessYahooSymbolForAShare(r.symbol) ?? r.symbol) : r.symbol || undefined
      return {
        id: uuid(),
        assetClass,
        name: r.name,
        symbol,
        market: assetClass === 'stock' ? r.market : undefined,
        quantity: r.quantity,
        costPrice: r.costPrice,
        currency,
        currentPrice: r.currentPrice,
        priceSource: 'manual',
        note: r.symbol ? `导入自文件 · 原始代码 ${r.symbol}` : '导入自文件',
        createdAt: new Date().toISOString(),
      }
    })
    onImport(holdings, mergeMode)
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="导入持仓 (CSV / Excel)" width={780}>
      {!table ? (
        <div>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            支持从同花顺、东方财富、中信证券等国内券商软件导出的持仓文件(CSV / XLS / XLSX)。国内券商大多不提供个人可直接调用的持仓查询
            API,请在券商 App 或交易软件中导出「持仓/资金股份」明细文件后在此上传。
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
            <Field label="导入为">
              <select className={inputClass} value={assetClass} onChange={(e) => setAssetClass(e.target.value as AssetClass)}>
                <option value="stock">股票</option>
                <option value="fund">基金</option>
              </select>
            </Field>
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
          </div>

          <div className="mb-4">
            <div className="text-xs font-medium text-[var(--text-muted)] mb-2">列映射(请确认自动识别是否正确)</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FIELDS.map((f) => (
                <label key={f} className="block">
                  <span className="block text-[11px] text-[var(--text-subtle)] mb-1">
                    {IMPORT_FIELD_LABEL[f]}
                    {IMPORT_FIELD_REQUIRED[f] && <span className="text-[var(--down)]"> *</span>}
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
                请为以下必填字段选择对应列:{missingRequired.map((f) => IMPORT_FIELD_LABEL[f]).join('、')}
              </div>
            )}
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-[var(--text-muted)]">
                预览({includedRows.length}/{parsedRows.length} 项将导入{invalidCount > 0 ? `,${invalidCount} 项数据不完整已自动跳过` : ''})
              </div>
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <input type="checkbox" checked={mergeMode} onChange={(e) => setMergeMode(e.target.checked)} />
                代码已存在时更新持仓(否则新增)
              </label>
            </div>
            <div className="border border-[var(--border)] rounded-lg overflow-auto max-h-64 scroll-thin">
              <table className="w-full text-xs">
                <thead className="bg-[var(--surface-alt)] sticky top-0">
                  <tr>
                    <th className="p-2 text-left w-8"></th>
                    <th className="p-2 text-left">代码</th>
                    <th className="p-2 text-left">名称</th>
                    <th className="p-2 text-right">数量</th>
                    <th className="p-2 text-right">成本价</th>
                    <th className="p-2 text-right">现价</th>
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
                      <td className="p-2 text-right num">{r.quantity || '—'}</td>
                      <td className="p-2 text-right num">{r.costPrice || '—'}</td>
                      <td className="p-2 text-right num">{r.currentPrice ?? '—'}</td>
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
