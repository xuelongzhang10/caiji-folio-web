import { useMemo } from 'react'
import { useStore } from '../state/store'
import { allocationByClass, convertToBase, holdingMarketValueBase, portfolioCostBase, portfolioTotalBase } from '../lib/calculations'
import { formatMoney, formatPercent } from '../lib/format'
import { PageHeader, StatCard, Card, EmptyState, Button } from '../components/ui'
import AllocationPie from '../components/charts/AllocationPie'
import TrendLine from '../components/charts/TrendLine'
import { Link } from 'react-router-dom'
import { ASSET_CLASS_LABEL, MARKET_LABEL } from '../types'

export default function Dashboard() {
  const { state } = useStore()
  const { holdings, closedPositions, settings, snapshots, dividends } = state

  const total = portfolioTotalBase(holdings, settings)
  const cost = portfolioCostBase(holdings, settings)
  const holdingsPnl = total - cost
  const closedPnl = useMemo(
    () => closedPositions.reduce((sum, c) => sum + convertToBase(c.realizedPnl, c.currency, settings), 0),
    [closedPositions, settings],
  )
  const pnl = holdingsPnl + closedPnl
  const pnlPercent = cost > 0 ? (holdingsPnl / cost) * 100 : 0
  const allocation = useMemo(() => allocationByClass(holdings, settings), [holdings, settings])

  const ytdDividends = useMemo(() => {
    const year = new Date().getFullYear()
    return dividends
      .filter((d) => new Date(d.date).getFullYear() === year)
      .reduce((sum, d) => sum + (d.currency === settings.baseCurrency ? d.amount : d.amount), 0)
  }, [dividends, settings.baseCurrency])

  const topHoldings = useMemo(
    () =>
      [...holdings]
        .map((h) => ({ h, value: holdingMarketValueBase(h, settings) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [holdings, settings],
  )

  if (holdings.length === 0 && closedPositions.length === 0) {
    return (
      <div>
        <PageHeader title="总览" subtitle="欢迎使用财记 Folio" />
        <Card>
          <EmptyState
            title="还没有任何持仓"
            hint="添加你的第一笔股票、基金、黄金或现金资产,开始追踪你的投资组合"
            action={
              <Link to="/holdings">
                <Button>去添加持仓</Button>
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="总览" subtitle={`基准货币 ${settings.baseCurrency}`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="总资产" value={formatMoney(total, settings.baseCurrency)} />
        <StatCard
          label="累计盈亏"
          value={formatMoney(pnl, settings.baseCurrency)}
          sub={
            closedPnl !== 0
              ? `持仓 ${formatMoney(holdingsPnl, settings.baseCurrency)} · 已清仓 ${formatMoney(closedPnl, settings.baseCurrency)}`
              : formatPercent(pnlPercent)
          }
          tone={pnl >= 0 ? 'up' : 'down'}
        />
        <StatCard label="持仓数量" value={String(holdings.length)} />
        <StatCard label="本年度分红" value={formatMoney(ytdDividends, settings.baseCurrency)} tone="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <Card className="p-4 md:p-5">
          <div className="font-medium text-sm mb-3">资产走势</div>
          <TrendLine data={snapshots} baseCurrency={settings.baseCurrency} />
        </Card>
        <Card className="p-4 md:p-5">
          <div className="font-medium text-sm mb-3">资产配置</div>
          <AllocationPie data={allocation} baseCurrency={settings.baseCurrency} />
        </Card>
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-sm">持仓市值 Top 5</div>
          <Link to="/holdings" className="text-xs text-[var(--brand)] font-medium">
            查看全部
          </Link>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {topHoldings.map(({ h, value }) => (
            <div key={h.id} className="flex items-center justify-between py-2.5 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{h.name}</div>
                <div className="text-xs text-[var(--text-subtle)]">
                  {ASSET_CLASS_LABEL[h.assetClass]}
                  {h.market ? ` · ${MARKET_LABEL[h.market]}` : ''}
                </div>
              </div>
              <div className="num font-medium shrink-0">{formatMoney(value, settings.baseCurrency)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
