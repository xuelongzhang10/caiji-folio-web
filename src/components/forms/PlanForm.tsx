import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { Holding, PlanFrequency, RecurringPlan } from '../../types'
import { Button, Field, inputClass } from '../ui'
import { todayStr } from '../../lib/format'

const FREQ_LABEL: Record<PlanFrequency, string> = { weekly: '每周', biweekly: '每两周', monthly: '每月' }

export default function PlanForm({
  holdings,
  onSubmit,
  onCancel,
}: {
  holdings: Holding[]
  onSubmit: (p: RecurringPlan) => void
  onCancel: () => void
}) {
  const [holdingId, setHoldingId] = useState(holdings[0]?.id ?? '')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<PlanFrequency>('monthly')
  const [nextDate, setNextDate] = useState(todayStr())

  function handleHoldingChange(id: string) {
    setHoldingId(id)
    const h = holdings.find((x) => x.id === id)
    if (h && !name) setName(`${h.name} 定投`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!holdingId) return
    onSubmit({
      id: uuid(),
      holdingId,
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      frequency,
      nextDate,
      active: true,
      history: [],
      createdAt: new Date().toISOString(),
    })
  }

  if (holdings.length === 0) {
    return (
      <div className="text-sm text-[var(--text-muted)]">
        请先在「持仓」页添加一支股票或基金,才能为它设置定投计划。
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={onCancel}>
            知道了
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="定投标的">
        <select className={inputClass} value={holdingId} onChange={(e) => handleHoldingChange(e.target.value)}>
          {holdings.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="计划名称">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="每期金额">
          <input className={inputClass} type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="频率">
          <select className={inputClass} value={frequency} onChange={(e) => setFrequency(e.target.value as PlanFrequency)}>
            {(Object.keys(FREQ_LABEL) as PlanFrequency[]).map((f) => (
              <option key={f} value={f}>
                {FREQ_LABEL[f]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="下次扣款日期">
        <input className={inputClass} type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} required />
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">创建计划</Button>
      </div>
    </form>
  )
}

export { FREQ_LABEL }
