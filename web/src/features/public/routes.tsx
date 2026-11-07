import { lazy, Suspense } from 'react'

import type { Area } from '@/app/area'
import { LoadingState } from '@/components/states'

const LandingPage = lazy(() =>
  import('./components/landing-page').then((m) => ({ default: m.LandingPage })),
)
const LeagueDirectory = lazy(() =>
  import('./components/league-directory').then((m) => ({ default: m.LeagueDirectory })),
)
const LeagueDetailPage = lazy(() =>
  import('./components/league-detail-page').then((m) => ({ default: m.LeagueDetailPage })),
)
const TournamentDetailPage = lazy(() =>
  import('./components/tournament-detail-page').then((m) => ({ default: m.TournamentDetailPage })),
)
const TeamDetailPage = lazy(() =>
  import('./components/team-detail-page').then((m) => ({ default: m.TeamDetailPage })),
)

/** Public portal: league directory, tournament standings, team details. */
export const area: Area = {
  publicRoutes: [
    { index: true, element: <Suspense fallback={<LoadingState />}><LandingPage /></Suspense> },
    { path: 'ligas', element: <Suspense fallback={<LoadingState />}><LeagueDirectory /></Suspense> },
    {
      path: 'liga/:slug',
      element: <Suspense fallback={<LoadingState />}><LeagueDetailPage /></Suspense>,
    },
    {
      path: 'liga/:slug/torneo/:tournamentId',
      element: <Suspense fallback={<LoadingState />}><TournamentDetailPage /></Suspense>,
    },
    {
      path: 'equipos/:teamId',
      element: <Suspense fallback={<LoadingState />}><TeamDetailPage /></Suspense>,
    },
  ],
}
