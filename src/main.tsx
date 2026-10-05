import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@/lib/theme'
import { StoreProvider } from '@/lib/store'
import { AuthProvider } from '@/lib/auth'
import { AppShell } from '@/components/AppShell'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { NewApplicationPage } from '@/pages/NewApplicationPage'
import { MyApplicationsPage } from '@/pages/MyApplicationsPage'
import { ApplicationDetailPage } from '@/pages/ApplicationDetailPage'
import { BeneficiariesPage } from '@/pages/BeneficiariesPage'
import { ProgressReportsPage } from '@/pages/ProgressReportsPage'
import { StaffProgressReportsPage } from '@/pages/StaffProgressReportsPage'
import { AccountingPage } from '@/pages/AccountingPage'
import { PartnersPage } from '@/pages/PartnersPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// GitHub Pages serves the app from /APTA-funding/ — restore deep links saved by
// public/404.html (Pages has no server rewrite, so 404.html stages the path).
function restoreDeepLink(): void {
  try {
    const saved = sessionStorage.getItem('apta-redirect')
    if (saved && saved.includes('/APTA-funding/')) {
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
      { path: 'applications', element: <MyApplicationsPage /> },
      { path: 'applications/new', element: <NewApplicationPage /> },
      { path: 'applications/:id', element: <ApplicationDetailPage /> },
      { path: 'dashboard/beneficiaries', element: <BeneficiariesPage /> },
      { path: 'progress-reports', element: <ProgressReportsPage /> },
      { path: 'staff/progress-reports', element: <StaffProgressReportsPage /> },
      { path: 'staff/accounting', element: <AccountingPage /> },
      { path: 'staff/partners', element: <PartnersPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], { basename: '/APTA-funding' })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <StoreProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </StoreProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
