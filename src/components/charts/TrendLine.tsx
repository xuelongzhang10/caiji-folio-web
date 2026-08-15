import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Snapshot } from '../../types'
import { formatDate, formatMoney } from '../../lib/format'

export default function TrendLine({ data, baseCurrency }: { data: Snapshot[]; baseCurrency: string }) {
  if (data.length < 2) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-[var(--text-subtle)]">
        持续记录几天数据后将显示资产走势
      </div>
    )
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}
            tick={{ fontSize: 11, fill: 'var(--text-subtle)' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis hide domain={['dataMin - dataMin*0.02', 'dataMax + dataMax*0.02']} />
          <Tooltip
            labelFormatter={(d) => formatDate(String(d))}
            formatter={(value) => [formatMoney(Number(value), baseCurrency), '总资产']}
            contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}
          />
          <Area type="monotone" dataKey="totalValueBase" stroke="var(--brand)" strokeWidth={2} fill="url(#trendFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
