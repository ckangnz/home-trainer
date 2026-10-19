import { Suspense, lazy, type ComponentType, type ReactNode } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import { useT } from '@/i18n/translate'
import { LandingPage } from '@/pages/LandingPage'
import { ExercisesPage } from '@/pages/ExercisesPage'
import { ExerciseDetailPage } from '@/pages/ExerciseDetailPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'
import { WorkoutDetailPage } from '@/pages/WorkoutDetailPage'
import { PrivacyPage, TermsPage } from '@/pages/LegalPages'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SharePreviewPage } from '@/sharing/SharePreviewPage'
import { AppShell } from './AppShell'
import { RequireAuth } from './RequireAuth'

function lazyPage<T extends Record<string, ComponentType>>(load: () => Promise<T>, name: keyof T) {
  return lazy(() => load().then((module) => ({ default: module[name] })))
}

const HomePage = lazyPage(() => import('@/pages/HomePage'), 'HomePage')
const RoutineEditorPage = lazyPage(() => import('@/pages/RoutineEditorPage'), 'RoutineEditorPage')
const HistoryPage = lazyPage(() => import('@/pages/HistoryPage'), 'HistoryPage')
const SettingsPage = lazyPage(() => import('@/pages/SettingsPage'), 'SettingsPage')
const ImportPage = lazyPage(() => import('@/sharing/ImportPage'), 'ImportPage')
const FriendsPage = lazyPage(() => import('@/friends/FriendsPage'), 'FriendsPage')
const FriendPage = lazyPage(() => import('@/friends/FriendPage'), 'FriendPage')
const FriendAddPage = lazyPage(() => import('@/friends/FriendAddPage'), 'FriendAddPage')
const PlayerPage = lazyPage(() => import('@/player/PlayerPage'), 'PlayerPage')

function Loading({ children }: { children: ReactNode }) {
  const t = useT()
  return (
    <Suspense
      fallback={
        <div className="center" role="status" aria-label={t('common.loading')}>
          <div className="spinner" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      {import.meta.env.DEV ? (
        <Route
          path="/dev/play/:kind/:id"
          element={
            <Loading>
              <PlayerPage />
            </Loading>
          }
        />
      ) : null}
      <Route
        path="/app/play/:kind/:id"
        element={
          <RequireAuth guestWhenUnconfigured>
            <Loading>
              <PlayerPage />
            </Loading>
          </RequireAuth>
        }
      />
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="exercises/:id" element={<ExerciseDetailPage />} />
        <Route path="workouts" element={<WorkoutsPage />} />
        <Route path="workouts/:id" element={<WorkoutDetailPage />} />
        <Route path="r/:code" element={<SharePreviewPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route
          path="app/settings"
          element={
            <RequireAuth guestWhenUnconfigured>
              <Loading>
                <SettingsPage />
              </Loading>
            </RequireAuth>
          }
        />
        <Route
          path="app"
          element={
            <RequireAuth>
              <Loading>
                <Outlet />
              </Loading>
            </RequireAuth>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="routines/new" element={<RoutineEditorPage />} />
          <Route path="routines/:id" element={<RoutineEditorPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="friends" element={<FriendsPage />} />
          <Route path="friends/add/:code" element={<FriendAddPage />} />
          <Route path="friends/:uid" element={<FriendPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
