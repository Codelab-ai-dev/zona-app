import type { RouteObject } from 'react-router'

import type { Role } from '@/lib/auth/auth-context'

/** A navigation entry shown in the dashboard header for the given roles. */
export interface NavItem {
  to: string
  label: string
  roles: Role[]
}

/** What each feature area contributes to the app shell. */
export interface Area {
  /** Routes rendered inside the public layout (no login required). */
  publicRoutes?: RouteObject[]
  /** Routes rendered inside the dashboard layout, guarded by role. */
  dashboardRoutes?: { roles: Role[]; routes: RouteObject[] }
  nav?: NavItem[]
}
