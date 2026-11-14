import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router'

import { LoadingState } from '@/components/states'
import { RequireRole } from '@/lib/auth/require-role'
import { useAuth } from '@/lib/auth/auth-context'

import { area as adminArea } from '@/features/admin/routes'
import { area as leagueCompetitionArea } from '@/features/league-admin/competition/routes'
import { area as leagueFixturesArea } from '@/features/league-admin/fixtures/routes'
import { area as leagueMatchesArea } from '@/features/league-admin/matches/routes'
import { area as leagueTeamsArea } from '@/features/league-admin/teams/routes'
import { area as playArea } from '@/features/play/routes'
import { area as publicArea } from '@/features/public/routes'
import { area as teamOwnerArea } from '@/features/team-owner/routes'

import type { Area } from './area'
import { DashboardLayout } from './layouts/dashboard-layout'
import { PublicLayout } from './layouts/public-layout'
import { DocumentTitle } from './document-title'
import { NotFoundPage } from './not-found'
import { InstallPrompt } from './pwa/install-prompt'
import { RouteError } from './route-error'

// Each area is a separate chunk so the public portal stays light.
const LoginPage = lazy(() => import('@/features/auth/login-page').then((m) => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() => import('@/features/auth/forgot-password-page').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/features/auth/reset-password-page').then((m) => ({ default: m.ResetPasswordPage })))

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>
}

/** /dashboard sends each role to its own area. */
function DashboardRedirect() {
  const { profile } = useAuth()
  switch (profile?.role) {
    case 'super_admin':
      return <Navigate to="/admin" replace />
    case 'league_admin':
      return <Navigate to="/liga-admin" replace />
    case 'team_owner':
      return <Navigate to="/mi-equipo" replace />
    default:
      return <Navigate to="/" replace />
  }
}

/**
 * Every feature area, in navigation order. Zona Play is deferred and its API
 * routes are off by default (PLAY_ENABLED, #51): its pages and nav tab only
 * exist in builds made with VITE_PLAY_ENABLED=true.
 */
export function featureAreas(playEnabled: boolean): Area[] {
  return [publicArea, ...(playEnabled ? [playArea] : []), adminArea, leagueMatchesArea, leagueFixturesArea, leagueTeamsArea, leagueCompetitionArea, teamOwnerArea]
}

export const areas: Area[] = featureAreas(import.meta.env.VITE_PLAY_ENABLED === 'true')

const allNav = areas.flatMap((a) => a.nav ?? [])

/**
 * Route map. Feature areas register their pages here:
 * - public portal: /, /ligas, /liga/:slug, /liga/:slug/torneo/:tournamentId, /equipos/:teamId
 * - super admin: /admin/*        - league admin: /liga-admin/*
 * - team owner: /mi-equipo/*     - Zona Play: /play/*
 */
const appRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { path: 'login', element: <Lazy><LoginPage /></Lazy> },
      { path: 'recuperar-contrasena', element: <Lazy><ForgotPasswordPage /></Lazy> },
      { path: 'reset-password', element: <Lazy><ResetPasswordPage /></Lazy> },
      ...areas.flatMap((a) => a.publicRoutes ?? []),
    ],
  },
  ...areas
    .filter((a) => a.dashboardRoutes)
    .map((a) => ({
      element: (
        <RequireRole roles={a.dashboardRoutes?.roles}>
          <DashboardLayout nav={allNav}>
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          </DashboardLayout>
        </RequireRole>
      ),
      children: a.dashboardRoutes?.routes ?? [],
    })),
  {
    element: (
      <RequireRole>
        <DashboardLayout nav={allNav}>
          <Outlet />
        </DashboardLayout>
      </RequireRole>
    ),
    children: [{ path: 'dashboard', element: <DashboardRedirect /> }],
  },
  { path: '*', element: <NotFoundPage /> },
]

/** App shell: route errors, page titles and the install prompt wrap every page. */
function Root() {
  return (
    <>
      <DocumentTitle />
      <Outlet />
      <InstallPrompt />
    </>
  )
}

export const router = createBrowserRouter([{ element: <Root />, errorElement: <RouteError />, children: appRoutes }])
