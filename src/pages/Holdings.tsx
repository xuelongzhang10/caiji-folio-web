import { useMemo, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useStore } from '../state/store'
import type { AssetClass, ClosedPosition, Holding } from '../types'
import { ASSET_CLASS_LABEL, MARKET_LABEL } from '../types'
import {
  convertToBase,
  holdingMarketValue,
  holdingMarketValueBase,
  holdingPnl,
  holdingPnlPercent,
  portfolioCostBase,
  portfolioTotalBase,
} from '../lib/calculations'
import { formatMoney, formatPercent, formatDate } from '../lib/format'
import { Button, Card, ConfirmBar, EmptyState, Modal, PageHeader, StatCard, inputClass } from '../components/ui'
import HoldingForm from '../components/forms/HoldingForm'
import ClosedPositionForm from '../components/forms/ClosedPositionForm'
import ImportHoldingsModal from '../components/ImportHoldingsModal'
import ImportClosedPositionsModal from '../components/ImportClosedPositionsModal'
import { fetchQuotesBatch, GOLD_SYMBOL } from '../lib/quotes'

const TABS: { key: AssetClass; label: string }[] = [
  { key: 'stock', label: '股票' },
  { key: 'fund', label: '基金' },
  { key: 'gold', label: '黄金' },
  { key: 'cash', label: '现金' },
  { key: 'custom', label: '自定义' },
]

const UNASSIGNED = '__unassigned__'

export default function Holdings() {
  const {
    state,
    addHolding,
    updateHolding,
    removeHolding,
    addBroker,
    updateBroker,
    removeBroker,
    addClosedPosition,
    updateClosedPosition,
    removeClosedPosition,
  } = useStore()
  const [view, setView] = useState<'open' | 'closed'>('open')
  const [tab, setTab] = useState<AssetClass>('stock')
  const [brokerFilter, setBrokerFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<Holding | undefined>(undefined)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [addingBroker, setAddingBroker] = useState(false)
  const [newBrokerName, setNewBrokerName] = useState('')
  const [editingBrokerId, setEditingBrokerId] = useState<string | null>(null)
  const [editBrokerName, setEditBrokerName] = useState('')
  const [confirmDeleteBrokerId, setConfirmDeleteBrokerId] = useState<string | null>(null)
  const [closedFormOpen, setClosedFormOpen] = useState(false)
  const [closedImportOpen, setClosedImportOpen] = useState(false)
  const [editingClosed, setEditingClosed] = useState<ClosedPosition | undefined>(undefined)
  const [confirmDeleteClosedId, setConfirmDeleteClosedId] = useState<string | null>(null)

  const matchesBroker = (item: { brokerId?: string }) => {
    if (brokerFilter === 'all') return true
    if (brokerFilter === UNASSIGNED) return !item.brokerId
    return item.brokerId === brokerFilter
  }

  const brokerScopeItems: { brokerId?: string }[] = view === 'open' ? state.holdings : state.closedPositions
  const countForBroker = (id: string | typeof UNASSIGNED) =>
    brokerScopeItems.filter((x) => (id === UNASSIGNED ? !x.brokerId : x.brokerId === id)).length

  const filtered = useMemo(
    () =>
      state.holdings.filter(
        (h) =>
          h.assetClass === tab &&
          matchesBroker(h) &&
          (query.trim() === '' || h.name.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.holdings, tab, brokerFilter, query],
  )

  const brokerHoldings = useMemo(
    () => (brokerFilter === 'all' ? [] : state.holdings.filter(matchesBroker)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.holdings, brokerFilter],
  )
  const brokerTotal = portfolioTotalBase(brokerHoldings, state.settings)
  const brokerCost = portfolioCostBase(brokerHoldings, state.settings)
  const brokerPnl = brokerTotal - brokerCost
  const brokerPnlPercent = brokerCost > 0 ? (brokerPnl / brokerCost) * 100 : 0

  const filteredClosed = useMemo(
    () =>
      state.closedPositions.filter(
        (c) => matchesBroker(c) && (query.trim() === '' || c.name.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.closedPositions, brokerFilter, query],
  )
  const closedInScope = useMemo(
    () => state.closedPositions.filter(matchesBroker),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.closedPositions, brokerFilter],
  )
  const closedRealizedTotal = closedInScope.reduce(
    (sum, c) => sum + convertToBase(c.realizedPnl, c.currency, state.settings),
    0,
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

  function submitNewBroker() {
    const name = newBrokerName.trim()
    if (name) addBroker({ id: uuid(), name, createdAt: new Date().toISOString() })
    setNewBrokerName('')
    setAddingBroker(false)
  }

  function startRenameBroker(id: string, name: string) {
    setEditingBrokerId(id)
    setEditBrokerName(name)
  }

  function submitRenameBroker() {
    const name = editBrokerName.trim()
    const broker = state.brokers.find((b) => b.id === editingBrokerId)
    if (name && broker) updateBroker({ ...broker, name })
    setEditingBrokerId(null)
  }

  function handleImport(imported: Holding[], mergeMode: boolean, syncMode: boolean) {
    let added = 0
    let updated = 0
    const matchedExistingIds = new Set<string>()
    for (const h of imported) {
      const existing = mergeMode
        ? state.holdings.find((x) => x.assetClass === h.assetClass && x.brokerId === h.brokerId && h.symbol && x.symbol === h.symbol)
        : undefined
      if (existing) {
        matchedExistingIds.add(existing.id)
        updateHolding({ ...existing, quantity: h.quantity, costPrice: h.costPrice, currentPrice: h.currentPrice ?? existing.currentPrice, currency: h.currency })
        updated++
      } else {
        addHolding(h)
        added++
      }
    }

    let removed = 0
    const importedAssetClass = imported[0]?.assetClass
    const importedBrokerId = imported[0]?.brokerId
    if (syncMode && importedAssetClass) {
      const toRemove = state.holdings.filter(
        (x) => x.assetClass === importedAssetClass && x.brokerId === importedBrokerId && !matchedExistingIds.has(x.id),
      )
      for (const x of toRemove) removeHolding(x.id)
      removed = toRemove.length
    }

    setTab(importedAssetClass ?? tab)
    setRefreshMsg(
      `导入完成:新增 ${added} 项${updated > 0 ? `,更新 ${updated} 项` : ''}${removed > 0 ? `,删除 ${removed} 项` : ''}`,
    )
    setTimeout(() => setRefreshMsg(null), 5000)
  }

  function openAddClosed() {
    setEditingClosed(undefined)
    setClosedFormOpen(true)
  }
  function openEditClosed(c: ClosedPosition) {
    setEditingClosed(c)
    setClosedFormOpen(true)
  }
  function handleSubmitClosed(c: ClosedPosition) {
    if (editingClosed) updateClosedPosition(c)
    else addClosedPosition(c)
    setClosedFormOpen(false)
  }
  function handleImportClosed(imported: ClosedPosition[]) {
    let added = 0
    let skipped = 0
    for (const c of imported) {
      const exists = state.closedPositions.some(
        (x) =>
          x.brokerId === c.brokerId &&
          (c.symbol ? x.symbol === c.symbol : x.name === c.name) &&
          x.lastDate === c.lastDate,
      )
      if (exists) {
        skipped++
      } else {
        addClosedPosition(c)
        added++
      }
    }
    setRefreshMsg(`导入完成:新增 ${added} 项${skipped > 0 ? `,已存在跳过 ${skipped} 项` : ''}`)
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
        subtitle={view === 'open' ? '管理股票、基金、黄金、现金与自定义资产' : '已经完全卖出的记录,及其已实现盈亏'}
        action={
          view === 'open' ? (
            <div className="flex gap-2 flex-wrap justify-end">
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                导入持仓
              </Button>
              <Button variant="secondary" onClick={refreshQuotes} disabled={refreshing}>
                {refreshing ? '刷新中…' : '刷新行情'}
              </Button>
              <Button onClick={openAdd}>+ 添加持仓</Button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap justify-end">
              <Button variant="secondary" onClick={() => setClosedImportOpen(true)}>
                导入清仓记录
              </Button>
              <Button onClick={openAddClosed}>+ 添加清仓记录</Button>
            </div>
          )
        }
      />

      <div className="inline-flex rounded-xl border border-[var(--border)] p-1 mb-4 bg-[var(--surface-alt)]">
        <button
          onClick={() => setView('open')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            view === 'open' ? 'bg-[var(--surface)] shadow-sm text-[var(--text)]' : 'text-[var(--text-muted)]'
          }`}
        >
          现有持仓 <span className="text-xs text-[var(--text-subtle)]">{state.holdings.length}</span>
        </button>
        <button
          onClick={() => setView('closed')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            view === 'closed' ? 'bg-[var(--surface)] shadow-sm text-[var(--text)]' : 'text-[var(--text-muted)]'
          }`}
        >
          已清仓 <span className="text-xs text-[var(--text-subtle)]">{state.closedPositions.length}</span>
        </button>
      </div>

      {refreshMsg && <div className="text-xs text-[var(--text-muted)] bg-[var(--surface-alt)] rounded-lg px-3 py-2 mb-4">{refreshMsg}</div>}

      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto scroll-thin">
        <button
          onClick={() => setBrokerFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
            brokerFilter === 'all'
              ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-alt)]'
          }`}
        >
          全部目录
        </button>
        {state.brokers.map((b) => {
          const isActive = brokerFilter === b.id
          if (editingBrokerId === b.id) {
            return (
              <input
                key={b.id}
                autoFocus
                className={inputClass + ' w-28 !py-1 text-xs'}
                value={editBrokerName}
                onChange={(e) => setEditBrokerName(e.target.value)}
                onBlur={submitRenameBroker}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRenameBroker()
                  if (e.key === 'Escape') setEditingBrokerId(null)
                }}
              />
            )
          }
          return (
            <div key={b.id} className="flex items-center">
              <button
                onClick={() => setBrokerFilter(b.id)}
                onDoubleClick={() => startRenameBroker(b.id, b.name)}
                title="双击可重命名"
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
                  isActive
                    ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-alt)]'
                }`}
              >
                {b.name}
                <span className={`ml-1 ${isActive ? 'text-white/80' : 'text-[var(--text-subtle)]'}`}>
                  {countForBroker(b.id)}
                </span>
              </button>
              {isActive && (
                <button
                  onClick={() => setConfirmDeleteBrokerId(b.id)}
                  aria-label="删除目录"
                  className="ml-0.5 text-[var(--text-subtle)] hover:text-[var(--down)] px-1"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
        {state.brokers.length > 0 && brokerScopeItems.some((x) => !x.brokerId) && (
          <button
            onClick={() => setBrokerFilter(UNASSIGNED)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
              brokerFilter === UNASSIGNED
                ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-alt)]'
            }`}
          >
            未分类
            <span className={`ml-1 ${brokerFilter === UNASSIGNED ? 'text-white/80' : 'text-[var(--text-subtle)]'}`}>
              {countForBroker(UNASSIGNED)}
            </span>
          </button>
        )}
        {addingBroker ? (
          <input
            autoFocus
            className={inputClass + ' w-28 !py-1 text-xs'}
            placeholder="目录名称,如 招商证券"
            value={newBrokerName}
            onChange={(e) => setNewBrokerName(e.target.value)}
            onBlur={submitNewBroker}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitNewBroker()
              if (e.key === 'Escape') {
                setAddingBroker(false)
                setNewBrokerName('')
              }
            }}
          />
        ) : (
          <button
            onClick={() => setAddingBroker(true)}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border border-dashed border-[var(--border)] text-[var(--text-subtle)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            + 新建目录
          </button>
        )}
      </div>

      {confirmDeleteBrokerId && (
        <div className="mb-3">
          <ConfirmBar
            message={`删除目录「${state.brokers.find((b) => b.id === confirmDeleteBrokerId)?.name}」?其中的持仓和清仓记录会移到"未分类",不会被删除`}
            onConfirm={() => {
              removeBroker(confirmDeleteBrokerId)
              setConfirmDeleteBrokerId(null)
              setBrokerFilter('all')
            }}
            onCancel={() => setConfirmDeleteBrokerId(null)}
          />
        </div>
      )}

      {view === 'open' && brokerFilter !== 'all' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="目录总市值" value={formatMoney(brokerTotal, state.settings.baseCurrency)} />
          <StatCard
            label="目录持仓盈亏"
            value={formatMoney(brokerPnl, state.settings.baseCurrency)}
            sub={formatPercent(brokerPnlPercent)}
            tone={brokerPnl >= 0 ? 'up' : 'down'}
          />
          <StatCard
            label="目录累计盈亏"
            value={formatMoney(brokerPnl + closedRealizedTotal, state.settings.baseCurrency)}
            sub={`持仓 ${formatMoney(brokerPnl, state.settings.baseCurrency)} · 已清仓 ${formatMoney(closedRealizedTotal, state.settings.baseCurrency)}`}
            tone={brokerPnl + closedRealizedTotal >= 0 ? 'up' : 'down'}
          />
          <StatCard label="目录持仓数" value={String(brokerHoldings.length)} />
        </div>
      )}

      {view === 'closed' && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard
            label={brokerFilter === 'all' ? '累计已实现盈亏' : '目录已实现盈亏'}
            value={formatMoney(closedRealizedTotal, state.settings.baseCurrency)}
            tone={closedRealizedTotal >= 0 ? 'up' : 'down'}
          />
          <StatCard label="清仓笔数" value={String(closedInScope.length)} />
        </div>
      )}

      {view === 'open' && (
      <>
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

      {state.holdings.filter((h) => h.assetClass === tab && matchesBroker(h)).length > 0 && (
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
                      {brokerFilter === 'all' && h.brokerId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-alt)] text-[var(--text-subtle)]">
                          {state.brokers.find((b) => b.id === h.brokerId)?.name ?? '未知目录'}
                        </span>
                      )}
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
      </>
      )}

      {view === 'closed' && (
        <>
          {closedInScope.length > 0 && (
            <input
              className={inputClass + ' mb-3 max-w-xs'}
              placeholder="搜索名称…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}

          {filteredClosed.length === 0 ? (
            <Card>
              <EmptyState
                title="还没有已清仓记录"
                hint="手动添加,或从券商流水导入"
                action={<Button onClick={openAddClosed}>+ 添加清仓记录</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-2.5">
              {filteredClosed.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{c.name}</span>
                        {c.market && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-alt)] text-[var(--text-subtle)]">
                            {MARKET_LABEL[c.market]}
                          </span>
                        )}
                        {c.symbol && <span className="text-[11px] text-[var(--text-subtle)] num">{c.symbol}</span>}
                        {brokerFilter === 'all' && c.brokerId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-alt)] text-[var(--text-subtle)]">
                            {state.brokers.find((b) => b.id === c.brokerId)?.name ?? '未知目录'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--text-subtle)] mt-1 num">
                        {c.buyQuantity != null ? `买入 ${c.buyQuantity} · 卖出 ${c.sellQuantity}` : `卖出 ${c.sellQuantity}`}
                        {c.lastDate && ` · ${formatDate(c.lastDate)}清仓`}
                      </div>
                      {c.note && <div className="text-xs text-[var(--text-subtle)] mt-0.5">{c.note}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-semibold num ${c.realizedPnl >= 0 ? 'text-[var(--up)]' : 'text-[var(--down)]'}`}>
                        {formatMoney(c.realizedPnl, c.currency)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
                    <button className="text-xs font-medium text-[var(--brand)]" onClick={() => openEditClosed(c)}>
                      编辑
                    </button>
                    {confirmDeleteClosedId === c.id ? (
                      <span className="text-xs flex items-center gap-2">
                        确认删除?
                        <button
                          className="text-[var(--down)] font-medium"
                          onClick={() => {
                            removeClosedPosition(c.id)
                            setConfirmDeleteClosedId(null)
                          }}
                        >
                          删除
                        </button>
                        <button className="text-[var(--text-muted)]" onClick={() => setConfirmDeleteClosedId(null)}>
                          取消
                        </button>
                      </span>
                    ) : (
                      <button className="text-xs font-medium text-[var(--text-subtle)]" onClick={() => setConfirmDeleteClosedId(c.id)}>
                        删除
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? '编辑持仓' : `添加${ASSET_CLASS_LABEL[tab]}`}>
        <HoldingForm
          assetClass={editing?.assetClass ?? tab}
          initial={editing}
          brokers={state.brokers}
          defaultBrokerId={brokerFilter !== 'all' && brokerFilter !== UNASSIGNED ? brokerFilter : undefined}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <ImportHoldingsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        brokers={state.brokers}
        defaultBrokerId={brokerFilter !== 'all' && brokerFilter !== UNASSIGNED ? brokerFilter : undefined}
        existingHoldings={state.holdings}
      />

      <Modal open={closedFormOpen} onClose={() => setClosedFormOpen(false)} title={editingClosed ? '编辑清仓记录' : '添加清仓记录'}>
        <ClosedPositionForm
          initial={editingClosed}
          brokers={state.brokers}
          defaultBrokerId={brokerFilter !== 'all' && brokerFilter !== UNASSIGNED ? brokerFilter : undefined}
          onSubmit={handleSubmitClosed}
          onCancel={() => setClosedFormOpen(false)}
        />
      </Modal>

      <ImportClosedPositionsModal
        open={closedImportOpen}
        onClose={() => setClosedImportOpen(false)}
        onImport={handleImportClosed}
        brokers={state.brokers}
        defaultBrokerId={brokerFilter !== 'all' && brokerFilter !== UNASSIGNED ? brokerFilter : undefined}
      />
    </div>
  )
}
