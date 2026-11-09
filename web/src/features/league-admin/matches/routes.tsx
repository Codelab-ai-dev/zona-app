import { lazy } from 'react'

import type { Area } from '@/app/area'

const MatchesLayoutPage = lazy(() => import('./matches-layout-page').then((m) => ({ default: m.MatchesLayoutPage })))
const ResultsLayoutPage = lazy(() => import('./matches-layout-page').then((m) => ({ default: m.ResultsLayoutPage })))

/** Routes and navigation for league-admin matches (calendar, results, scheduling). */
export const area: Area = {
  dashboardRoutes: {
    roles: ['league_admin', 'super_admin'],
    routes: [
      {
        path: 'liga-admin/calendario',
        element: <MatchesLayoutPage />,
      },
      {
        path: 'liga-admin/resultados',
        element: <ResultsLayoutPage />,
      },
    ],
  },
  nav: [
    {
      to: '/liga-admin/calendario',
      label: 'Calendario',
      roles: ['league_admin', 'super_admin'],
    },
    {
      to: '/liga-admin/resultados',
      label: 'Resultados',
      roles: ['league_admin', 'super_admin'],
    },
  ],
}
