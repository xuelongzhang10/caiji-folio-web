import { NavLink, Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'

const NAV_ITEMS = [
  { to: '/', label: '总览', icon: HomeIcon, end: true },
  { to: '/holdings', label: '持仓', icon: StackIcon, end: false },
  { to: '/dividends', label: '分红', icon: CoinIcon, end: false },
  { to: '/plans', label: '定投', icon: RepeatIcon, end: false },
  { to: '/settings', label: '设置', icon: GearIcon, end: false },
]

export default function Layout() {
  return (
    <div className="min-h-full flex flex-col md:flex-row bg-[var(--bg)] text-[var(--text)]">
      <aside className="hidden md:flex md:w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] flex-col">
        <div className="px-5 py-5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--brand)] text-white flex items-center justify-center font-semibold text-sm">
            财
          </div>
          <div>
            <div className="font-semibold text-[15px] leading-tight">财记 Folio</div>
            <div className="text-xs text-[var(--text-subtle)] leading-tight">个人资产管理</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 text-xs text-[var(--text-subtle)]">数据仅保存在本机浏览器</div>
      </aside>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 py-5 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-[var(--border)] bg-[var(--surface)] flex justify-around py-1.5 z-20">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[11px] font-medium ${
                isActive ? 'text-[var(--brand)]' : 'text-[var(--text-subtle)]'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function iconProps(className?: string) {
  return {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
}

function HomeIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg {...iconProps(className)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}
function StackIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg {...iconProps(className)}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  )
}
function CoinIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.5 9.5h3.7a1.8 1.8 0 1 1 0 3.6h-2.4a1.8 1.8 0 1 0 0 3.6H14" />
    </svg>
  )
}
function RepeatIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg {...iconProps(className)}>
      <path d="M4 7h13l-3-3M20 17H7l3 3" />
    </svg>
  )
}
function GearIcon({ className }: { className?: string }): ReactNode {
  return (
    <svg {...iconProps(className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.97 7.97 0 0 0 0-2l2-1.5-2-3.5-2.4.6a8 8 0 0 0-1.7-1L14.8 3h-4l-.5 2.6a8 8 0 0 0-1.7 1l-2.4-.6-2 3.5L6.2 11a7.97 7.97 0 0 0 0 2l-2 1.5 2 3.5 2.4-.6a8 8 0 0 0 1.7 1L9.2 21h4l.5-2.6a8 8 0 0 0 1.7-1l2.4.6 2-3.5-2-1.5Z" />
    </svg>
  )
}
