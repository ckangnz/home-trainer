import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { DataProvider } from '@/data/DataProvider'
import { FriendsProvider } from '@/friends/FriendsProvider'
import { ToastProvider } from './Toast'
import { AppRoutes } from './routes'
import { BASE_PATH } from './site'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        <FriendsProvider>
          <ToastProvider>{children}</ToastProvider>
        </FriendsProvider>
      </DataProvider>
    </AuthProvider>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export function App() {
  return (
    <AppProviders>
      <BrowserRouter basename={BASE_PATH || undefined}>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  )
}
