import { useRef, useState } from 'react'
import { useStore } from '../state/store'
import { CURRENCIES } from '../types'
import { Button, Card, PageHeader, inputClass } from '../components/ui'
import { exportStateAsJson, importStateFromJson } from '../lib/storage'
import { formatDate } from '../lib/format'

export default function Settings() {
  const { state, setBaseCurrency, refreshFxRates, replaceState, resetState } = useStore()
  const [fxLoading, setFxLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleRefreshFx() {
    setFxLoading(true)
    await refreshFxRates()
    setFxLoading(false)
    setMsg('汇率已更新')
    setTimeout(() => setMsg(null), 2500)
  }

  function handleExport() {
    const json = exportStateAsJson(state)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `caiji-folio-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const next = importStateFromJson(String(reader.result))
        replaceState(next)
        setMsg('数据已导入')
      } catch {
        setMsg('导入失败:文件格式不正确')
      }
      setTimeout(() => setMsg(null), 3000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div>
      <PageHeader title="设置" subtitle="基准货币、数据备份与还原" />

      {msg && <div className="text-xs text-[var(--text-muted)] bg-[var(--surface-alt)] rounded-lg px-3 py-2 mb-4">{msg}</div>}

      <Card className="p-5 mb-4">
        <div className="font-medium text-sm mb-1">基准货币</div>
        <p className="text-xs text-[var(--text-subtle)] mb-3">总资产、图表等统一按此货币换算展示</p>
        <div className="flex items-center gap-3">
          <select
            className={inputClass + ' max-w-[160px]'}
            value={state.settings.baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={handleRefreshFx} disabled={fxLoading}>
            {fxLoading ? '更新中…' : '刷新汇率'}
          </Button>
        </div>
        <p className="text-xs text-[var(--text-subtle)] mt-2">
          {state.settings.fxUpdatedAt ? `汇率更新于 ${formatDate(state.settings.fxUpdatedAt)}` : '尚未获取汇率'} · 数据来自 Frankfurter (欧洲央行参考汇率)
        </p>
      </Card>

      <Card className="p-5 mb-4">
        <div className="font-medium text-sm mb-1">数据备份</div>
        <p className="text-xs text-[var(--text-subtle)] mb-3">
          所有数据仅保存在本机浏览器 localStorage 中,不会上传到任何服务器。建议定期导出备份,更换设备或清理浏览器数据前请先导出。
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            导出备份 (JSON)
          </Button>
          <Button variant="secondary" onClick={handleImportClick}>
            导入备份
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="font-medium text-sm mb-1 text-[var(--down)]">重置数据</div>
        <p className="text-xs text-[var(--text-subtle)] mb-3">清空所有持仓、分红与定投计划,此操作不可恢复,建议先导出备份。</p>
        {confirmReset ? (
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              onClick={() => {
                resetState()
                setConfirmReset(false)
              }}
            >
              确认清空所有数据
            </Button>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              取消
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            重置数据
          </Button>
        )}
      </Card>
    </div>
  )
}
