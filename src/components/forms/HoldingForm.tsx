import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { AssetClass, Broker, CurrencyCode, Holding, Market } from '../../types'
import { CURRENCIES, MARKET_LABEL } from '../../types'
import { Button, Field, inputClass } from '../ui'
import { MARKET_SYMBOL_HINT } from '../../lib/quotes'

const MARKETS: Market[] = ['A', 'HK', 'US', 'DE', 'UK', 'OTHER']

export default function HoldingForm({
  assetClass,
  initial,
  brokers,
  defaultBrokerId,
  onSubmit,
  onCancel,
}: {
  assetClass: AssetClass
  initial?: Holding
  brokers: Broker[]
  defaultBrokerId?: string
  onSubmit: (h: Holding) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [symbol, setSymbol] = useState(initial?.symbol ?? '')
  const [market, setMarket] = useState<Market>(initial?.market ?? 'A')
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? (assetClass === 'custom' ? 1 : '')))
  const [costPrice, setCostPrice] = useState(String(initial?.costPrice ?? ''))
  const [currentPrice, setCurrentPrice] = useState(String(initial?.currentPrice ?? ''))
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? 'CNY')
  const [brokerId, setBrokerId] = useState(initial?.brokerId ?? defaultBrokerId ?? '')
  const [note, setNote] = useState(initial?.note ?? '')

  const isCashLike = assetClass === 'cash' || assetClass === 'custom'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qty = parseFloat(quantity) || 0
    const cost = parseFloat(costPrice) || 0
    const cur = currentPrice.trim() === '' ? undefined : parseFloat(currentPrice)
    const holding: Holding = {
      id: initial?.id ?? uuid(),
      assetClass,
      brokerId: brokerId || undefined,
      name: name.trim(),
      symbol: symbol.trim() || undefined,
      market: assetClass === 'stock' ? market : undefined,
      quantity: qty,
      costPrice: cost,
      currency,
      currentPrice: cur,
      priceUpdatedAt: initial?.priceUpdatedAt,
      priceSource: initial?.priceSource ?? 'manual',
      note: note.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    onSubmit(holding)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label={assetClass === 'custom' ? '资产名称' : '名称'} hint={assetClass === 'custom' ? '如:上海某公寓、腕表收藏' : undefined}>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required placeholder="例如 贵州茅台 / 沪深300ETF" />
      </Field>

      {brokers.length > 0 && (
        <Field label="所属目录(可选)" hint="按券商/账户分组,便于分别查看盈亏">
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

      {assetClass === 'stock' && (
        <Field label="市场">
          <select className={inputClass} value={market} onChange={(e) => setMarket(e.target.value as Market)}>
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {MARKET_LABEL[m]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {(assetClass === 'stock' || assetClass === 'fund' || assetClass === 'gold') && (
        <Field label="行情代码(可选)" hint={assetClass === 'stock' ? MARKET_SYMBOL_HINT[market] : '用于自动拉取最新价格,留空则手动维护价格'}>
          <input className={inputClass} value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="如 AAPL / 0700.HK" />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label={isCashLike ? '数量(填 1)' : '持仓数量'}>
          <input
            className={inputClass}
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            disabled={assetClass === 'cash'}
          />
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
        <Field label={isCashLike ? (assetClass === 'cash' ? '金额' : '成本/初始估值') : '成本单价'}>
          <input className={inputClass} type="number" step="any" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required />
        </Field>
        {!isCashLike && (
          <Field label="当前单价(可选)" hint="留空则用成本价计算">
            <input className={inputClass} type="number" step="any" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} />
          </Field>
        )}
        {assetClass === 'custom' && (
          <Field label="当前估值(可选)" hint="留空则用初始估值">
            <input className={inputClass} type="number" step="any" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} />
          </Field>
        )}
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
