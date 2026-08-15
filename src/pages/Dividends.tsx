import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { formatDate, formatMoney } from '../lib/format'
import { Button, Card, EmptyState, Modal, PageHeader, StatCard } from '../components/ui'
import DividendForm from '../components/forms/DividendForm'

export default function Dividends() {
  const { state, addDividend, removeDividend } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const sorted = useMemo(() => [...state.dividends].sort((a, b) => b.date.localeCompare(a.date)), [state.dividends])

  const totalsByCurrency = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of state.dividends) map.set(d.currency, (map.get(d.currency) ?? 0) + d.amount)
    return Array.from(map.entries())
  }, [state.dividends])

  const holdingName = (id?: string) => (id ? state.holdings.find((h) => h.id === id)?.name : undefined)

  return (
    <div>
      <PageHeader title="分红记录" subtitle="记录股票与基金的分红、派息" action={<Button onClick={() => setFormOpen(true)}>+ 添加分红</Button>} />

      {totalsByCurrency.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {totalsByCurrency.map(([currency, amount]) => (
            <StatCard key={currency} label={`累计分红 (${currency})`} value={formatMoney(amount, currency)} tone="up" />
          ))}
        </div>
      )}

      {sorted.length === 0 ? (
        <Card>
          <EmptyState title="还没有分红记录" hint="收到股票或基金分红时,在这里记一笔" action={<Button onClick={() => setFormOpen(true)}>+ 添加分红</Button>} />
        </Card>
      ) : (
        <Card className="divide-y divide-[var(--border)]">
          {sorted.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{d.name}</div>
                <div className="text-xs text-[var(--text-subtle)] mt-0.5">
                  {formatDate(d.date)}
                  {holdingName(d.holdingId) && ` · 关联 ${holdingName(d.holdingId)}`}
                  {d.note && ` · ${d.note}`}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="font-semibold text-[var(--up)] num text-sm">+{formatMoney(d.amount, d.currency)}</div>
                {confirmDeleteId === d.id ? (
                  <span className="text-xs flex items-center gap-1.5">
                    <button className="text-[var(--down)] font-medium" onClick={() => { removeDividend(d.id); setConfirmDeleteId(null) }}>
                      确认
                    </button>
                    <button className="text-[var(--text-muted)]" onClick={() => setConfirmDeleteId(null)}>
                      取消
                    </button>
                  </span>
                ) : (
                  <button className="text-xs text-[var(--text-subtle)]" onClick={() => setConfirmDeleteId(d.id)}>
                    删除
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="添加分红记录">
        <DividendForm
          holdings={state.holdings.filter((h) => h.assetClass === 'stock' || h.assetClass === 'fund')}
          onSubmit={(d) => {
            addDividend(d)
            setFormOpen(false)
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  )
}
