import { lazy, Suspense } from 'react'

import type { Area } from '@/app/area'
import { LoadingState } from '@/components/states'

import { PlayLayout } from './play-layout'

const PlayPage = lazy(() => import('@/features/play/play-page').then((m) => ({ default: m.PlayPage })))
const ClipsPage = lazy(() => import('@/features/play/clips-page').then((m) => ({ default: m.ClipsPage })))
const SearchPage = lazy(() => import('@/features/play/search-page').then((m) => ({ default: m.SearchPage })))
const WatchPage = lazy(() => import('@/features/play/watch-page').then((m) => ({ default: m.WatchPage })))
const TeamPage = lazy(() => import('@/features/play/team-page').then((m) => ({ default: m.TeamPage })))
const LivePage = lazy(() => import('@/features/play/live-page').then((m) => ({ default: m.LivePage })))
const AdminPage = lazy(() => import('@/features/play/admin-page').then((m) => ({ default: m.AdminPage })))

/** Routes and navigation of the play area. */
export const area: Area = {
  publicRoutes: [
    {
      element: <PlayLayout />,
      children: [
        { path: 'play', element: <Suspense fallback={<LoadingState />}><PlayPage /></Suspense> },
        { path: 'play/clips', element: <Suspense fallback={<LoadingState />}><ClipsPage /></Suspense> },
        { path: 'play/search', element: <Suspense fallback={<LoadingState />}><SearchPage /></Suspense> },
        { path: 'play/watch/:videoId', element: <Suspense fallback={<LoadingState />}><WatchPage /></Suspense> },
        { path: 'play/team/:teamId', element: <Suspense fallback={<LoadingState />}><TeamPage /></Suspense> },
        { path: 'play/live/:streamId', element: <Suspense fallback={<LoadingState />}><LivePage /></Suspense> },
      ],
    },
  ],
  dashboardRoutes: {
    roles: ['league_admin', 'super_admin'],
    routes: [
      { path: 'play/admin', element: <Suspense fallback={<LoadingState />}><AdminPage /></Suspense> },
    ],
  },
  nav: [
    { to: '/play/admin', label: 'Zona Play', roles: ['league_admin', 'super_admin'] },
  ],
}
