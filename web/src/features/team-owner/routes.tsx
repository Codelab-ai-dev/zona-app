import { lazy } from 'react'
import type { Area } from '@/app/area'

const DashboardPage = lazy(() => import('./dashboard-page').then((m) => ({ default: m.DashboardPage })))

export const area: Area = {
  dashboardRoutes: {
    roles: ['team_owner'],
    routes: [
      {
        path: 'mi-equipo',
        element: <DashboardPage />,
      },
    ],
  },
  nav: [
    {
      to: '/mi-equipo',
      label: 'Mi Equipo',
      roles: ['team_owner'],
    },
  ],
}
