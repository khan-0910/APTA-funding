import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
import { DEV_TOOLS, useAuth } from '@/lib/auth'
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

function Crest({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-700 to-primary-950 text-amber-300 ring-1 ring-amber-400/50 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M12 3 2 8l10 5 10-5-10-5z" />
        <path d="M5 11.5V16c0 2 3.1 3.8 7 3.8s7-1.8 7-3.8v-4.5l-7 3.5-7-3.5z" opacity=".8" />
      </svg>
    </div>
  )
}

export function AppShell() {
  const { user, can, signOut, setDevRole, devRoleOverride } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
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
      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
        Menu / <span className="ta tracking-normal">பட்டியல்</span>
      </p>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setDrawerOpen(false)}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
              isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-amber-400 transition-transform duration-200 ${
                  isActive ? 'scale-y-100' : 'scale-y-0'
                }`}
                aria-hidden="true"
              />
              <item.icon
                className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? 'text-amber-300' : 'text-white/50 group-hover:text-white/80'}`}
              />
              <span>
                {item.en} <span className="ta text-xs opacity-60">/ {item.ta}</span>
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )

  const Brand = (
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
      <Crest />
      <div className="leading-tight">
        <p className="font-display text-base font-bold text-white">APTA Empowers</p>
        <p className="ta text-[11px] text-amber-200/80">கல்வி உதவித் திட்டம்</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="glass-sidebar sticky top-0 hidden h-screen w-72 shrink-0 flex-col lg:flex no-print">
        {Brand}
        {SidebarLinks}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] p-2.5 ring-1 ring-white/10">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-primary-950">
              {(user?.name ?? 'G').slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name ?? 'Guest'}</p>
              <p className="truncate text-xs text-white/55">{user?.email ?? 'Not signed in'}</p>
            </div>
            {user && (
              <button
                onClick={handleSignOut}
                className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-red-300"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden no-print">
          <div className="anim-fade absolute inset-0 bg-primary-950/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="glass-sidebar anim-drawer absolute left-0 top-0 flex h-full w-72 flex-col">
            <div className="flex items-center justify-between">
              {Brand}
              <button onClick={() => setDrawerOpen(false)} className="p-2 text-white/60 hover:text-white" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {SidebarLinks}
            {user && (
              <div className="border-t border-white/10 p-3">
                <button
                  onClick={() => {
                    setDrawerOpen(false)
                    void handleSignOut()
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.06] hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" /> Sign out / <span className="ta">வெளியேறு</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Global header */}
        <header className="sticky top-0 z-30 border-b border-surface-200/80 bg-white/85 backdrop-blur-xl dark:border-white/[0.07] dark:bg-primary-950/85 no-print">
          <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDrawerOpen(true)}
                className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <NavLink to="/" className="flex items-center gap-2 lg:hidden" aria-label="APTA Empowers home">
                <Crest className="h-8 w-8" />
              </NavLink>
              <NavLink
                to="/"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-surface-600 transition hover:bg-primary-50 hover:text-primary-800 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-white"
                title="Homepage / முகப்புப் பக்கம்"
              >
                <Home className="h-4.5 w-4.5" />
                <span className="hidden sm:inline">Home / <span className="ta">முகப்பு</span></span>
              </NavLink>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* DEV role switcher — local development builds only */}
              {DEV_TOOLS && (
                <label className="hidden items-center gap-1.5 rounded-lg border border-dashed border-amber-400/70 bg-amber-400/10 px-2.5 py-1.5 sm:flex">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">DEV</span>
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
              )}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="rounded-lg p-2 text-surface-500 transition hover:bg-primary-50 hover:text-primary-800 dark:hover:bg-surface-800 dark:hover:text-amber-300"
                title="Toggle theme / தீம் மாற்று"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>

              {/* DB viewer trigger */}
              {can('review') && (
                <button
                  onClick={() => setDbOpen(true)}
                  className="rounded-lg p-2 text-surface-500 transition hover:bg-primary-50 hover:text-primary-800 dark:hover:bg-surface-800 dark:hover:text-amber-300"
                  title="Database viewer"
                  aria-label="Database viewer"
                >
                  <Database className="h-4.5 w-4.5" />
                </button>
              )}

              {/* Avatar */}
              {user && (
                <div className="flex items-center gap-2 rounded-full border border-surface-200 bg-white/80 py-1 pl-1 pr-3 dark:border-surface-700 dark:bg-surface-900/70">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-800 text-xs font-bold text-amber-300">
                    {user.name.slice(0, 1)}
                  </div>
                  <span className="hidden max-w-[140px] truncate text-xs font-semibold text-surface-700 dark:text-surface-200 sm:inline">
                    {user.name} · <span className="capitalize">{effectiveRole}</span>
                  </span>
                </div>
              )}

              {!user && (
                <button onClick={() => navigate('/login')} className="btn-primary !px-3 !py-1.5 !text-xs">
                  <UserRound className="h-3.5 w-3.5" /> Sign In
                </button>
              )}
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" aria-hidden="true" />
        </header>

        <main key={location.pathname} className="page-enter flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-white/10 bg-primary-900 px-6 py-5 text-center text-xs text-white/60 dark:bg-surface-950 no-print">
          <span className="font-display font-semibold text-white/85">APTA Empowers</span> · All Praise To Allah · Salem, Tamil Nadu ·{' '}
          <span className="ta text-amber-200/80">ஜகாத் கல்வி நிதி</span>
        </footer>
      </div>

      <DatabaseViewerModal open={dbOpen} onClose={() => setDbOpen(false)} />
    </div>
  )
}
