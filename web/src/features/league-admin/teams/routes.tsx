import type { RouteObject } from 'react-router'

import type { Area } from '@/app/area'

/** Routes and navigation of this area. Owned by the area's port. */
export const area: Area = {
  dashboardRoutes: {
    roles: ['league_admin', 'super_admin'],
    routes: [
      {
        path: '/liga-admin/equipos',
        lazy: () => import('./teams-list-page').then((m) => ({ Component: m.TeamsListPage })),
      },
      {
        path: '/liga-admin/solicitudes',
        lazy: () => import('./requests-page').then((m) => ({ Component: m.RequestsPage })),
      },
      {
        path: '/liga-admin/grupos',
        lazy: () => import('./verification-page').then((m) => ({ Component: m.VerificationPage })),
      },
      {
        path: '/liga-admin/verificacion',
        lazy: () => import('./verification-page').then((m) => ({ Component: m.VerificationPage })),
      },
    ] as RouteObject[],
  },
  nav: [
    {
      to: '/liga-admin/equipos',
      label: 'Equipos',
      roles: ['league_admin'],
    },
    {
      to: '/liga-admin/solicitudes',
      label: 'Solicitudes',
      roles: ['league_admin'],
    },
  ],
}
