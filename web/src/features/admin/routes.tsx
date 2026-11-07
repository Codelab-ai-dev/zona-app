import { lazy } from 'react'
import type { RouteObject } from 'react-router'
import type { Area } from '@/app/area'

const AdminDashboardPage = lazy(() => import('./admin-dashboard-page').then(m => ({ default: m.AdminDashboardPage })))

const dashboardRoutes: RouteObject[] = [
  {
    index: true,
    Component: AdminDashboardPage,
  },
]

/** Routes and navigation of this area. Owned by the area's port. */
export const area: Area = {
  dashboardRoutes: {
    roles: ['super_admin'],
    routes: dashboardRoutes,
  },
  nav: [
    {
      to: '/admin',
      label: 'Administración',
      roles: ['super_admin'],
    },
  ],
}
