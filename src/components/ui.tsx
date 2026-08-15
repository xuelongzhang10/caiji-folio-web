import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useEffect } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow)] ${className}`}
    >
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-[var(--text)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles: Record<string, string> = {
    primary: 'bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]',
    secondary: 'bg-[var(--surface-alt)] text-[var(--text)] hover:brightness-95 border border-[var(--border)]',
    ghost: 'text-[var(--text-muted)] hover:bg-[var(--surface-alt)]',
    danger: 'bg-[var(--down)]/10 text-[var(--down)] hover:bg-[var(--down)]/20',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 480,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-[var(--surface)] w-full md:rounded-2xl rounded-t-2xl border border-[var(--border)] shadow-xl max-h-[88vh] overflow-y-auto scroll-thin"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)]">
          <h2 className="font-semibold text-[15px]">{title}</h2>
          <button onClick={onClose} className="text-[var(--text-subtle)] hover:text-[var(--text)] p-1" aria-label="关闭">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block mb-3.5">
      <span className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-[var(--text-subtle)] mt-1">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text)] focus:border-[var(--brand)]'

export function StatCard({ label, value, sub, tone = 'default' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'up' | 'down' }) {
  const toneClass = tone === 'up' ? 'text-[var(--up)]' : tone === 'down' ? 'text-[var(--down)]' : 'text-[var(--text)]'
  return (
    <Card className="p-4">
      <div className="text-xs text-[var(--text-muted)] mb-1.5">{label}</div>
      <div className={`text-2xl font-semibold num ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--text-subtle)] mt-1 num">{sub}</div>}
    </Card>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-full bg-[var(--surface-alt)] flex items-center justify-center mb-3">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-[var(--text-subtle)]">
          <path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
          <path d="M14 4v4a1 1 0 0 0 1 1h4" />
        </svg>
      </div>
      <div className="font-medium text-sm text-[var(--text)]">{title}</div>
      {hint && <div className="text-xs text-[var(--text-subtle)] mt-1 max-w-xs">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ConfirmBar({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2 text-xs bg-[var(--down)]/10 text-[var(--down)] rounded-lg px-3 py-2">
      <span className="flex-1">{message}</span>
      <button onClick={onConfirm} className="font-medium underline">
        确认
      </button>
      <button onClick={onCancel} className="text-[var(--text-muted)]">
        取消
      </button>
    </div>
  )
}
