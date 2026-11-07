import React from 'react'
import ReactDOM from 'react-dom/client'
// Fonts are bundled with the site (no Google Fonts request, so no visitor data leaves for a third party).
import '@fontsource-variable/inter/index.css'
import '@fontsource-variable/source-serif-4/index.css'
import '@fontsource/noto-sans-tamil/400.css'
import '@fontsource/noto-sans-tamil/600.css'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { LangProvider } from '@/lib/lang'
import { StoreProvider } from '@/lib/store'
import { AuthProvider } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { MyApplicationsPage } from '@/pages/MyApplicationsPage'
import { ProgressReportsPage } from '@/pages/ProgressReportsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// The app is served from import.meta.env.BASE_URL (/APTA-funding/ on GitHub Pages,
// / on a custom domain). Restore deep links staged
// by public/404.html (Pages has no server rewrite, so 404.html stages the path).
// The route arrives as a ?r= query param: query params survive the extra
// document load GitHub Pages can perform after the fallback redirect, which
// sessionStorage-based staging did not.
const BASE = import.meta.env.BASE_URL

function restoreDeepLink(): void {
  try {
    const url = new URL(window.location.href)
    const staged = url.searchParams.get('r')
    if (staged !== null) {
      url.searchParams.delete('r')
      window.history.replaceState(null, '', url.pathname + url.search + url.hash)
      if (staged.startsWith(BASE)) {
        window.history.replaceState(null, '', staged)
        return
      }
    }
    // Legacy path: sessionStorage staging from previously cached 404.html.
    const saved = sessionStorage.getItem('apta-redirect')
    if (saved && saved.startsWith(BASE)) {
      sessionStorage.removeItem('apta-redirect')
      window.history.replaceState(null, '', saved)
    }
  } catch {
    /* ignore */
  }
}
restoreDeepLink()

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'reset', element: <ResetPasswordPage /> },
      { path: 'contact', lazy: () => import('@/pages/LegalPages').then((m) => ({ Component: m.ContactPage })) },
      { path: 'privacy', lazy: () => import('@/pages/LegalPages').then((m) => ({ Component: m.PrivacyPage })) },
      { path: 'terms', lazy: () => import('@/pages/LegalPages').then((m) => ({ Component: m.TermsPage })) },
      { path: 'applications', element: <MyApplicationsPage /> },
      { path: 'applications/new', lazy: () => import('@/pages/NewApplicationPage').then((m) => ({ Component: m.NewApplicationPage })) },
      { path: 'applications/:id', lazy: () => import('@/pages/ApplicationDetailPage').then((m) => ({ Component: m.ApplicationDetailPage })) },
      { path: 'dashboard/beneficiaries', lazy: () => import('@/pages/BeneficiariesPage').then((m) => ({ Component: m.BeneficiariesPage })) },
      { path: 'progress-reports', element: <ProgressReportsPage /> },
      { path: 'staff/progress-reports', lazy: () => import('@/pages/StaffProgressReportsPage').then((m) => ({ Component: m.StaffProgressReportsPage })) },
      { path: 'staff/accounting', lazy: () => import('@/pages/AccountingPage').then((m) => ({ Component: m.AccountingPage })) },
      { path: 'staff/partners', lazy: () => import('@/pages/PartnersPage').then((m) => ({ Component: m.PartnersPage })) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], { basename: BASE.replace(/\/$/, '') || '/' })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LangProvider>
      <StoreProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </StoreProvider>
    </LangProvider>
  </React.StrictMode>,
)
