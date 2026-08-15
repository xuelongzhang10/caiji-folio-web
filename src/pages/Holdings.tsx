import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import type { AssetClass, Holding } from '../types'
import { ASSET_CLASS_LABEL, MARKET_LABEL } from '../types'
import { holdingMarketValue, holdingMarketValueBase, holdingPnl, holdingPnlPercent } from '../lib/calculations'
import { formatMoney, formatPercent, formatDate } from '../lib/format'
import { Button, Card, EmptyState, Modal, PageHeader, inputClass } from '../components/ui'
import HoldingForm from '../components/forms/HoldingForm'
import ImportHoldingsModal from '../components/ImportHoldingsModal'
import { fetchQuotesBatch, GOLD_SYMBOL } from '../lib/quotes'

const TABS: { key: AssetClass; label: string }[] = [
  { key: 'stock', label: '股票' },
  { key: 'fund', label: '基金' },
  { key: 'gold', label: '黄金' },
  { key: 'cash', label: '现金' },
  { key: 'custom', label: '自定义' },
]

export default function Holdings() {
  const { state, addHolding, updateHolding, removeHolding } = useStore()
  const [tab, setTab] = useState<AssetClass>('stock')
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Holding | undefined>(undefined)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () =>
      state.holdings.filter(
        (h) => h.assetClass === tab && (query.trim() === '' || h.name.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    [state.holdings, tab, query],
  )

  function openAdd() {
    setEditing(undefined)
    setFormOpen(true)
  }
  function openEdit(h: Holding) {
    setEditing(h)
    setFormOpen(true)
  }
  function handleSubmit(h: Holding) {
    if (editing) updateHolding(h)
    else addHolding(h)
    setFormOpen(false)
  }

  function handleImport(imported: Holding[], mergeMode: boolean) {
    let added = 0
    let updated = 0
    for (const h of imported) {
      const existing = mergeMode
        ? state.holdings.find((x) => x.assetClass === h.assetClass && h.symbol && x.symbol === h.symbol)
        : undefined
      if (existing) {
        updateHolding({ ...existing, quantity: h.quantity, costPrice: h.costPrice, currentPrice: h.currentPrice ?? existing.currentPrice, currency: h.currency })
        updated++
      } else {
        addHolding(h)
        added++
      }
    }
    setTab(imported[0]?.assetClass ?? tab)
    setRefreshMsg(`导入完成:新增 ${added} 项${updated > 0 ? `,更新 ${updated} 项` : ''}`)
    setTimeout(() => setRefreshMsg(null), 5000)
  }

  async function refreshQuotes() {
    const candidates = state.holdings.filter((h) => (h.assetClass === 'stock' || h.assetClass === 'fund') && h.symbol)
    const goldHoldings = state.holdings.filter((h) => h.assetClass === 'gold')
    const symbols = Array.from(new Set([...candidates.map((h) => h.symbol as string), ...(goldHoldings.length ? [GOLD_SYMBOL] : [])]))
    if (symbols.length === 0) {
      setRefreshMsg('没有可自动刷新的持仓(需先填写行情代码)')
      setTimeout(() => setRefreshMsg(null), 3000)
      return
    }
    setRefreshing(true)
    setRefreshMsg(null)
    try {
      const results = await fetchQuotesBatch(symbols)
      let ok = 0
      let fail = 0
      for (const h of [...candidates, ...goldHoldings]) {
        const sym = h.assetClass === 'gold' ? GOLD_SYMBOL : (h.symbol as string)
        const res = results.get(sym)
        if (res && !(res instanceof Error)) {
          updateHolding({ ...h, currentPrice: res.price, priceUpdatedAt: res.updatedAt, priceSource: 'api' })
          ok++
        } else {
          fail++
        }
      }
      setRefreshMsg(fail === 0 ? `已更新 ${ok} 项行情` : `成功 ${ok} 项,失败 ${fail} 项(可能是行情代理暂不可用,请手动维护价格)`)
    } finally {
      setRefreshing(false)
      setTimeout(() => setRefreshMsg(null), 5000)
    }
  }

  return (
    <div>
      <PageHeader
        title="持仓"
        subtitle="管理股票、基金、黄金、现金与自定义资产"
        action={
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              导入持仓
            </Button>
            <Button variant="secondary" onClick={refreshQuotes} disabled={refreshing}>
              {refreshing ? '刷新中…' : '刷新行情'}
            </Button>
            <Button onClick={openAdd}>+ 添加持仓</Button>
          </div>
        }
      />

      {refreshMsg && <div className="text-xs text-[var(--text-muted)] bg-[var(--surface-alt)] rounded-lg px-3 py-2 mb-4">{refreshMsg}</div>}

      <div className="flex items-center gap-1 mb-4 overflow-x-auto scroll-thin border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              tab === t.key ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-muted)]'
            }`}
          >
            {t.label}
            <span className="ml-1 text-xs text-[var(--text-subtle)]">
              {state.holdings.filter((h) => h.assetClass === t.key).length}
            </span>
          </button>
        ))}
      </div>

      {state.holdings.filter((h) => h.assetClass === tab).length > 0 && (
        <input
          className={inputClass + ' mb-3 max-w-xs'}
          placeholder="搜索名称…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={`还没有${ASSET_CLASS_LABEL[tab]}持仓`}
            hint="点击右上角按钮添加一笔"
            action={<Button onClick={openAdd}>+ 添加{ASSET_CLASS_LABEL[tab]}</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((h) => {
            const value = holdingMarketValue(h)
            const valueBase = holdingMarketValueBase(h, state.settings)
            const pnl = holdingPnl(h)
            const pnlPct = holdingPnlPercent(h)
            const showPnl = h.assetClass !== 'cash'
            return (
              <Card key={h.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{h.name}</span>
                      {h.market && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-alt)] text-[var(--text-subtle)]">
                          {MARKET_LABEL[h.market]}
                        </span>
                      )}
                      {h.symbol && <span className="text-[11px] text-[var(--text-subtle)] num">{h.symbol}</span>}
                      {h.priceSource === 'api' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--brand-soft)] text-[var(--brand)]">自动</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-subtle)] mt-1 num">
                      {h.assetClass === 'cash'
                        ? `${h.currency}`
                        : `数量 ${h.quantity} · 成本价 ${formatMoney(h.costPrice, h.currency)}`}
                      {h.priceUpdatedAt && ` · 更新于 ${formatDate(h.priceUpdatedAt)}`}
                    </div>
                    {h.note && <div className="text-xs text-[var(--text-subtle)] mt-0.5">{h.note}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold num">{formatMoney(value, h.currency)}</div>
                    {h.currency !== state.settings.baseCurrency && (
                      <div className="text-xs text-[var(--text-subtle)] num">≈ {formatMoney(valueBase, state.settings.baseCurrency)}</div>
                    )}
                    {showPnl && (
                      <div className={`text-xs num ${pnl >= 0 ? 'text-[var(--up)]' : 'text-[var(--down)]'}`}>
                        {formatMoney(pnl, h.currency)} ({formatPercent(pnlPct, 1)})
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
                  <button className="text-xs font-medium text-[var(--brand)]" onClick={() => openEdit(h)}>
                    编辑
                  </button>
                  {confirmDeleteId === h.id ? (
                    <span className="text-xs flex items-center gap-2">
                      确认删除?
                      <button className="text-[var(--down)] font-medium" onClick={() => { removeHolding(h.id); setConfirmDeleteId(null) }}>
                        删除
                      </button>
                      <button className="text-[var(--text-muted)]" onClick={() => setConfirmDeleteId(null)}>
                        取消
                      </button>
                    </span>
                  ) : (
                    <button className="text-xs font-medium text-[var(--text-subtle)]" onClick={() => setConfirmDeleteId(h.id)}>
                      删除
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? '编辑持仓' : `添加${ASSET_CLASS_LABEL[tab]}`}>
        <HoldingForm assetClass={editing?.assetClass ?? tab} initial={editing} onSubmit={handleSubmit} onCancel={() => setFormOpen(false)} />
      </Modal>

      <ImportHoldingsModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
    </div>
  )
}
