import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { AllocationSlice } from '../../lib/calculations'
import { formatMoney, formatPercent } from '../../lib/format'

const COLORS = ['#0f766e', '#2dd4bf', '#f59e0b', '#6366f1', '#e5484d', '#8b5cf6']

export default function AllocationPie({ data, baseCurrency }: { data: AllocationSlice[]; baseCurrency: string }) {
  if (data.length === 0) {
    return <div className="h-56 flex items-center justify-center text-sm text-[var(--text-subtle)]">暂无持仓数据</div>
  }
  return (
    <div className="flex flex-col md:flex-row items-center gap-4">
      <div className="w-full md:w-48 h-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="valueBase" nameKey="label" innerRadius={52} outerRadius={78} paddingAngle={2} strokeWidth={0}>
              {data.map((entry, i) => (
                <Cell key={entry.assetClass} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatMoney(Number(value), baseCurrency), String(name)]}
              contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 w-full space-y-2">
        {data.map((slice, i) => (
          <div key={slice.assetClass} className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-[var(--text)] w-16 shrink-0">{slice.label}</span>
            <span className="text-[var(--text-subtle)] text-xs flex-1 num">{formatMoney(slice.valueBase, baseCurrency)}</span>
            <span className="font-medium num">{formatPercent(slice.percent, 1)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
