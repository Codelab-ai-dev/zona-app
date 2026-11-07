import { lazy, Suspense } from 'react'

import type { Area } from '@/app/area'
import { LoadingState } from '@/components/states'

const LeaguesPage = lazy(() => import('@/features/leagues/leagues-page').then((m) => ({ default: m.LeaguesPage })))

/** Public portal. Owned by the public-portal port; replace the temporary pages. */
export const area: Area = {
  publicRoutes: [
    { index: true, element: <Suspense fallback={<LoadingState />}><LeaguesPage /></Suspense> },
    { path: 'ligas', element: <Suspense fallback={<LoadingState />}><LeaguesPage /></Suspense> },
  ],
}
