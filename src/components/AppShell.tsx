import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BadgeIndianRupee,
  ClipboardCheck,
  Database,
  FileStack,
  Handshake,
  Home,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { DatabaseViewerModal } from './DatabaseViewerModal'
import type { UserRole } from '@/types'

const NAV: Array<{ to: string; en: string; ta: string; icon: typeof Home; roles: UserRole[] }> = [
  { to: '/applications', en: 'My Applications', ta: 'என் விண்ணப்பங்கள்', icon: FileStack, roles: ['student', 'staff', 'admin'] },
  { to: '/dashboard/beneficiaries', en: 'Beneficiaries', ta: 'பயனாளிகள்', icon: BadgeIndianRupee, roles: ['student', 'staff', 'admin'] },
  { to: '/progress-reports', en: 'Progress Reports', ta: 'முன்னேற்ற அறிக்கைகள்', icon: ScrollText, roles: ['student', 'staff', 'admin'] },
  { to: '/staff/progress-reports', en: 'Report Review', ta: 'அறிக்கை ஆய்வு', icon: ClipboardCheck, roles: ['staff', 'admin'] },
  { to: '/staff/accounting', en: 'Accounting', ta: 'கணக்கியல்', icon: BadgeIndianRupee, roles: ['staff', 'admin'] },
  { to: '/staff/partners', en: 'Partners', ta: 'கூட்டாளர்கள்', icon: Handshake, roles: ['staff', 'admin'] },
]

export function AppShell() {
  const { user, can, signOut, setDevRole, devRoleOverride } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dbOpen, setDbOpen] = useState(false)

  const effectiveRole: UserRole = devRoleOverride ?? user?.role ?? 'student'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = NAV.filter((n) => n.roles.includes(effectiveRole))

  const SidebarLinks = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setDrawerOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800'
            }`
          }
        >
          <item.icon className="h-4.5 w-4.5 shrink-0" />
          <span>
            {item.en} <span className="ta text-xs opacity-70">/ {item.ta}</span>
          </span>
        </NavLink>
      ))}
    </nav>
  )

  const Brand = (
    <div className="flex items-center gap-2.5 border-b border-surface-200/70 px-5 py-4 dark:border-surface-800">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 3 2 8l10 5 10-5-10-5z" opacity=".9" />
          <path d="M5 11.5V16c0 2 3.1 3.8 7 3.8s7-1.8 7-3.8v-4.5l-7 3.5-7-3.5z" opacity=".75" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold text-surface-900 dark:text-surface-50">APTA Empowers</p>
        <p className="ta text-[11px] text-surface-500 dark:text-surface-400">கல்வி உதவித் திட்டம்</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="glass-sidebar sticky top-0 hidden h-screen w-72 shrink-0 flex-col lg:flex no-print">
        {Brand}
        {SidebarLinks}
        <div className="border-t border-surface-200/70 p-3 dark:border-surface-800">
          <div className="glass-card flex items-center gap-2.5 p-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-600 dark:text-amber-300">
              {(user?.name ?? 'G').slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-surface-800 dark:text-surface-100">
                {user?.name ?? 'Guest'}
              </p>
              <p className="truncate text-xs text-surface-500 dark:text-surface-400">{user?.email ?? 'Not signed in'}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-lg p-1.5 text-surface-400 transition hover:bg-surface-100 hover:text-red-500 dark:hover:bg-surface-800"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden no-print">
          <div className="absolute inset-0 bg-surface-950/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="glass-sidebar absolute left-0 top-0 flex h-full w-72 flex-col">
            <div className="flex items-center justify-between">
              {Brand}
              <button onClick={() => setDrawerOpen(false)} className="p-2 text-surface-500" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {SidebarLinks}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Global header */}
        <header className="sticky top-0 z-30 border-b border-surface-200/70 bg-white/80 backdrop-blur-xl dark:border-surface-800 dark:bg-surface-950/80 no-print">
          <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDrawerOpen(true)}
                className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <NavLink
                to="/"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-surface-600 transition hover:bg-surface-100 hover:text-primary-700 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-primary-300"
                title="Homepage / முகப்புப் பக்கம்"
              >
                <Home className="h-4.5 w-4.5" />
                <span className="hidden sm:inline">Home / <span className="ta">முகப்பு</span></span>
              </NavLink>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* DEV role switcher */}
              <label className="hidden items-center gap-1.5 rounded-lg border border-dashed border-amber-400/60 bg-amber-500/5 px-2.5 py-1.5 sm:flex">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">DEV</span>
                <select
                  value={effectiveRole}
                  onChange={(e) => setDevRole(e.target.value as UserRole)}
                  className="bg-transparent text-xs font-semibold text-surface-700 outline-none dark:text-surface-200"
                  title="DEV mode role switcher"
                >
                  <option value="student">Student / மாணவர்</option>
                  <option value="staff">Staff / ஊழியர்</option>
                  <option value="admin">Admin / நிர்வாகி</option>
                </select>
              </label>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="rounded-lg p-2 text-surface-500 transition hover:bg-surface-100 dark:hover:bg-surface-800"
                title="Toggle theme / தீம் மாற்று"
              >
                {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>

              {/* DB viewer trigger */}
              {can('review') && (
                <button
                  onClick={() => setDbOpen(true)}
                  className="rounded-lg p-2 text-surface-500 transition hover:bg-surface-100 dark:hover:bg-surface-800"
                  title="Database viewer"
                >
                  <Database className="h-4.5 w-4.5" />
                </button>
              )}

              {/* Avatar */}
              <div className="flex items-center gap-2 rounded-full border border-surface-200 bg-white/70 py-1 pl-1 pr-3 dark:border-surface-700 dark:bg-surface-900/70">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {(user?.name ?? 'G').slice(0, 1)}
                </div>
                <span className="hidden max-w-[120px] truncate text-xs font-semibold text-surface-700 dark:text-surface-200 sm:inline">
                  {user?.name ?? 'Guest'} · {effectiveRole}
                </span>
              </div>

              {!user && (
                <button onClick={handleSignOutThenLogin} className="btn-primary !px-3 !py-1.5 !text-xs">
                  <UserRound className="h-3.5 w-3.5" /> Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-surface-200/70 px-6 py-4 text-center text-xs text-surface-400 dark:border-surface-800 no-print">
          APTA Empowers · All Praise To Allah · Salem, Tamil Nadu · <span className="ta">ஜகாத் கல்வி நிதி</span>
        </footer>
      </div>

      <DatabaseViewerModal open={dbOpen} onClose={() => setDbOpen(false)} />
    </div>
  )
}

async function handleSignOutThenLogin(): Promise<void> {
  window.location.href = '/login'
}
