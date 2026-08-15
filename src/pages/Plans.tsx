import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { useStore } from '../state/store'
import type { RecurringPlan } from '../types'
import { formatDate, formatMoney, todayStr } from '../lib/format'
import { Button, Card, EmptyState, Field, Modal, PageHeader, inputClass } from '../components/ui'
import PlanForm, { FREQ_LABEL } from '../components/forms/PlanForm'
import { holdingUnitPrice } from '../lib/calculations'

export default function Plans() {
  const { state, addPlan, removePlan, executePlan } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [executingPlan, setExecutingPlan] = useState<RecurringPlan | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const eligibleHoldings = state.holdings.filter((h) => h.assetClass === 'stock' || h.assetClass === 'fund')
  const sorted = [...state.plans].sort((a, b) => a.nextDate.localeCompare(b.nextDate))

  return (
    <div>
      <PageHeader title="定投计划" subtitle="定期投资提醒与执行记录" action={<Button onClick={() => setFormOpen(true)}>+ 新建计划</Button>} />

      {sorted.length === 0 ? (
        <Card>
          <EmptyState title="还没有定投计划" hint="为你的股票或基金持仓设置定期投资计划" action={<Button onClick={() => setFormOpen(true)}>+ 新建计划</Button>} />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((p) => {
            const holding = state.holdings.find((h) => h.id === p.holdingId)
            const isDue = p.nextDate <= todayStr()
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {p.name}
                      {isDue && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--down)]/10 text-[var(--down)]">待执行</span>}
                    </div>
                    <div className="text-xs text-[var(--text-subtle)] mt-1">
                      {holding?.name ?? '(标的已删除)'} · {FREQ_LABEL[p.frequency]} · 每期 {formatMoney(p.amount, holding?.currency ?? 'CNY')}
                    </div>
                    <div className="text-xs text-[var(--text-subtle)] mt-0.5">下次执行 {formatDate(p.nextDate)} · 已执行 {p.history.length} 次</div>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end shrink-0">
                    <Button variant="secondary" onClick={() => setExecutingPlan(p)} disabled={!holding}>
                      记一笔执行
                    </Button>
                    {confirmDeleteId === p.id ? (
                      <span className="text-xs flex items-center gap-1.5">
                        <button className="text-[var(--down)] font-medium" onClick={() => { removePlan(p.id); setConfirmDeleteId(null) }}>
                          确认删除
                        </button>
                        <button className="text-[var(--text-muted)]" onClick={() => setConfirmDeleteId(null)}>
                          取消
                        </button>
                      </span>
                    ) : (
                      <button className="text-xs text-[var(--text-subtle)]" onClick={() => setConfirmDeleteId(p.id)}>
                        删除计划
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="新建定投计划">
        <PlanForm
          holdings={eligibleHoldings}
          onSubmit={(p) => {
            addPlan(p)
            setFormOpen(false)
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      {executingPlan && (
        <ExecutePlanModal
          plan={executingPlan}
          onClose={() => setExecutingPlan(null)}
          onExecute={(price, date) => {
            const holding = state.holdings.find((h) => h.id === executingPlan.holdingId)
            if (!holding) return
            const quantity = price > 0 ? executingPlan.amount / price : 0
            const newQuantity = holding.quantity + quantity
            const newCostTotal = holding.quantity * holding.costPrice + executingPlan.amount
            const newCostPrice = newQuantity > 0 ? newCostTotal / newQuantity : holding.costPrice
            executePlan(executingPlan.id, { id: uuid(), date, amount: executingPlan.amount, price, quantity }, newQuantity, newCostPrice)
            setExecutingPlan(null)
          }}
        />
      )}
    </div>
  )
}

function ExecutePlanModal({ plan, onClose, onExecute }: { plan: RecurringPlan; onClose: () => void; onExecute: (price: number, date: string) => void }) {
  const { state } = useStore()
  const holding = state.holdings.find((h) => h.id === plan.holdingId)
  const [price, setPrice] = useState(String(holding ? holdingUnitPrice(holding) : ''))
  const [date, setDate] = useState(todayStr())

  return (
    <Modal open onClose={onClose} title={`执行「${plan.name}」`}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onExecute(parseFloat(price) || 0, date)
        }}
      >
        <p className="text-sm text-[var(--text-muted)] mb-3">
          本期扣款金额 <span className="font-medium text-[var(--text)] num">{formatMoney(plan.amount, holding?.currency ?? 'CNY')}</span>,请填写成交单价以计算买入数量。
        </p>
        <Field label="成交单价">
          <input className={inputClass} type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} required autoFocus />
        </Field>
        <Field label="执行日期">
          <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit">确认执行</Button>
        </div>
      </form>
    </Modal>
  )
}
