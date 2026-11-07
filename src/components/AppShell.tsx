import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BadgeIndianRupee,
  ClipboardCheck,
  Database,
  FileStack,
  Handshake,
  Landmark,
  LogOut,
  Menu,
  ScrollText,
  Users,
  X,
} from 'lucide-react'
import { DEV_TOOLS, useAuth } from '@/lib/auth'
import { useLang } from '@/lib/lang'
import { DatabaseViewerModal } from './DatabaseViewerModal'
import type { UserRole } from '@/types'

const NAV: Array<{ to: string; en: string; ta: string; icon: typeof FileStack; roles: UserRole[] }> = [
  { to: '/applications', en: 'Applications', ta: 'விண்ணப்பங்கள்', icon: FileStack, roles: ['student', 'staff', 'admin'] },
  { to: '/progress-reports', en: 'Progress reports', ta: 'முன்னேற்ற அறிக்கைகள்', icon: ScrollText, roles: ['student', 'staff', 'admin'] },
  { to: '/dashboard/beneficiaries', en: 'Beneficiaries', ta: 'பயனாளிகள்', icon: Users, roles: ['staff', 'admin'] },
  { to: '/staff/progress-reports', en: 'Report review', ta: 'அறிக்கை ஆய்வு', icon: ClipboardCheck, roles: ['staff', 'admin'] },
  { to: '/staff/accounting', en: 'Accounting', ta: 'கணக்கியல்', icon: BadgeIndianRupee, roles: ['staff', 'admin'] },
  { to: '/staff/partners', en: 'Partners', ta: 'கூட்டாளர்கள்', icon: Handshake, roles: ['staff', 'admin'] },
]

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`} aria-label="APTA Empowers — home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
        <Landmark className="h-4.5 w-4.5" strokeWidth={2.2} />
      </span>
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-tight text-surface-900">APTA Empowers</span>
        <span className="mt-0.5 block text-[11px] text-surface-500">Education fund · Salem</span>
      </span>
    </Link>
  )
}

export function LangSwitch() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex rounded-lg border border-surface-200 bg-white p-0.5 text-xs font-medium" role="group" aria-label="Display language">
      {(
        [
          ['en', 'English'],
          ['bi', 'English + தமிழ்'],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLang(value)}
          aria-pressed={lang === value}
          className={`rounded-md px-2.5 py-1 transition-colors ${
            lang === value ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:text-surface-800'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function AppShell() {
  const { user, can, signOut, setDevRole, devRoleOverride } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dbOpen, setDbOpen] = useState(false)

  // The homepage is a full-bleed page with its own header.
  if (location.pathname === '/') return <Outlet />

  const effectiveRole: UserRole = devRoleOverride ?? user?.role ?? 'student'
  const navItems = user ? NAV.filter((n) => n.roles.includes(effectiveRole)) : []

  const handleSignOut = async () => {
    setDrawerOpen(false)
    await signOut()
    navigate('/login')
  }

  const links = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4" aria-label="Main">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setDrawerOpen(false)}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive ? 'bg-primary-50 font-medium text-primary-700' : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary-600' : 'text-surface-400 group-hover:text-surface-600'}`} />
              <span className="min-w-0">
                <span className="block">{item.en}</span>
                <span className="ta block text-[11px] text-surface-500">{item.ta}</span>
              </span>
            </>
          )}
        </NavLink>
      ))}
      {navItems.length === 0 && (
        <p className="px-3 text-sm text-surface-500">
          <Link to="/login" className="font-medium text-primary-600 hover:underline">
            Sign in
          </Link>{' '}
          to see your applications.
        </p>
      )}
    </nav>
  )

  const account = user && (
    <div className="border-t border-surface-200 p-3">
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-surface-900">{user.name}</p>
          <p className="truncate text-xs capitalize text-surface-500">{effectiveRole}</p>
        </div>
        <button
          onClick={() => void handleSignOut()}
          className="rounded-md p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-surface-200 bg-white lg:flex no-print">
        <div className="flex h-16 items-center border-b border-surface-200 px-5">
          <Logo />
        </div>
        {links}
        {account}
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden no-print">
          <div className="anim-fade absolute inset-0 bg-surface-950/40" onClick={() => setDrawerOpen(false)} />
          <aside className="anim-drawer absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-surface-200 px-5">
              <Logo />
              <button onClick={() => setDrawerOpen(false)} className="rounded-md p-1.5 text-surface-500" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {links}
            {account}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-surface-200 bg-white/90 px-4 backdrop-blur sm:px-6 no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-md p-2 text-surface-500 hover:bg-surface-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Logo className="lg:hidden" />
          </div>

          <div className="flex items-center gap-2">
            {DEV_TOOLS && user && (
              <label className="hidden items-center gap-1.5 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-2 py-1 sm:flex">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Dev</span>
                <select
                  value={effectiveRole}
                  onChange={(e) => setDevRole(e.target.value as UserRole)}
                  className="bg-transparent text-xs font-medium text-surface-700 outline-none"
                  aria-label="Development role switcher"
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            )}
            <div className="hidden sm:block">
              <LangSwitch />
            </div>
            {can('review') && (
              <button
                onClick={() => setDbOpen(true)}
                className="rounded-md p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800"
                title="Database viewer"
                aria-label="Database viewer"
              >
                <Database className="h-4.5 w-4.5" />
              </button>
            )}
            {!user && (
              <Link to="/login" className="btn-primary !px-3 !py-1.5">
                Sign in
              </Link>
            )}
          </div>
        </header>

        <main key={location.pathname} className="page-enter flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mb-4 sm:hidden no-print">
            <LangSwitch />
          </div>
          <Outlet />
        </main>

        <footer className="border-t border-surface-200 px-6 py-4 text-xs text-surface-500 no-print">
          APTA Empowers · Zakkath education fund, Salem, Tamil Nadu
        </footer>
      </div>

      <DatabaseViewerModal open={dbOpen} onClose={() => setDbOpen(false)} />
    </div>
  )
}
