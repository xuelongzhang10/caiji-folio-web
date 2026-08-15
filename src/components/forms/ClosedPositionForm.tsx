import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { Broker, ClosedPosition, CurrencyCode, Market } from '../../types'
import { CURRENCIES, MARKET_LABEL } from '../../types'
import { Button, Field, inputClass } from '../ui'

const MARKETS: Market[] = ['A', 'HK', 'US', 'DE', 'UK', 'OTHER']

export default function ClosedPositionForm({
  initial,
  brokers,
  defaultBrokerId,
  onSubmit,
  onCancel,
}: {
  initial?: ClosedPosition
  brokers: Broker[]
  defaultBrokerId?: string
  onSubmit: (c: ClosedPosition) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [symbol, setSymbol] = useState(initial?.symbol ?? '')
  const [market, setMarket] = useState<Market>(initial?.market ?? 'A')
  const [buyQuantity, setBuyQuantity] = useState(String(initial?.buyQuantity ?? ''))
  const [sellQuantity, setSellQuantity] = useState(String(initial?.sellQuantity ?? ''))
  const [realizedPnl, setRealizedPnl] = useState(String(initial?.realizedPnl ?? ''))
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? 'CNY')
  const [firstDate, setFirstDate] = useState(initial?.firstDate ?? '')
  const [lastDate, setLastDate] = useState(initial?.lastDate ?? '')
  const [brokerId, setBrokerId] = useState(initial?.brokerId ?? defaultBrokerId ?? '')
  const [note, setNote] = useState(initial?.note ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const closed: ClosedPosition = {
      id: initial?.id ?? uuid(),
      brokerId: brokerId || undefined,
      name: name.trim(),
      symbol: symbol.trim() || undefined,
      market,
      currency,
      buyQuantity: buyQuantity.trim() === '' ? undefined : parseFloat(buyQuantity) || 0,
      sellQuantity: parseFloat(sellQuantity) || 0,
      realizedPnl: parseFloat(realizedPnl) || 0,
      firstDate: firstDate || undefined,
      lastDate: lastDate || undefined,
      note: note.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    onSubmit(closed)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="名称">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required placeholder="例如 贵州茅台" />
      </Field>

      {brokers.length > 0 && (
        <Field label="所属目录(可选)">
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="证券代码(可选)">
          <input className={inputClass} value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="如 600519" />
        </Field>
        <Field label="市场">
          <select className={inputClass} value={market} onChange={(e) => setMarket(e.target.value as Market)}>
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {MARKET_LABEL[m]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="累计买入数量(可选)">
          <input className={inputClass} type="number" step="any" value={buyQuantity} onChange={(e) => setBuyQuantity(e.target.value)} />
        </Field>
        <Field label="累计卖出数量">
          <input className={inputClass} type="number" step="any" value={sellQuantity} onChange={(e) => setSellQuantity(e.target.value)} required />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="已实现盈亏" hint="亏损填负数">
          <input className={inputClass} type="number" step="any" value={realizedPnl} onChange={(e) => setRealizedPnl(e.target.value)} required />
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="首次买入日期(可选)">
          <input className={inputClass} type="date" value={firstDate} onChange={(e) => setFirstDate(e.target.value)} />
        </Field>
        <Field label="最后卖出日期(可选)">
          <input className={inputClass} type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)} />
        </Field>
      </div>

      <Field label="备注(可选)">
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">{initial ? '保存修改' : '添加'}</Button>
      </div>
    </form>
  )
}
