import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { CurrencyCode, Dividend, Holding } from '../../types'
import { CURRENCIES } from '../../types'
import { Button, Field, inputClass } from '../ui'
import { todayStr } from '../../lib/format'

export default function DividendForm({
  holdings,
  onSubmit,
  onCancel,
}: {
  holdings: Holding[]
  onSubmit: (d: Dividend) => void
  onCancel: () => void
}) {
  const [holdingId, setHoldingId] = useState<string>('')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('CNY')
  const [date, setDate] = useState(todayStr())
  const [note, setNote] = useState('')

  function handleHoldingChange(id: string) {
    setHoldingId(id)
    const h = holdings.find((x) => x.id === id)
    if (h) {
      setName(`${h.name} 分红`)
      setCurrency(h.currency)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      id: uuid(),
      holdingId: holdingId || undefined,
      name: name.trim(),
      amount: parseFloat(amount) || 0,
      currency,
      date,
      note: note.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="关联持仓(可选)">
        <select className={inputClass} value={holdingId} onChange={(e) => handleHoldingChange(e.target.value)}>
          <option value="">不关联</option>
          {holdings.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="名称">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required placeholder="如 沪深300ETF 分红" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="金额">
          <input className={inputClass} type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
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
      <Field label="日期">
        <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>
      <Field label="备注(可选)">
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">添加</Button>
      </div>
    </form>
  )
}
