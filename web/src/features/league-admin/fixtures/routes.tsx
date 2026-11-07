import { lazy, Suspense } from 'react'

import type { Area } from '@/app/area'
import { LoadingState } from '@/components/states'

const FixturesPage = lazy(() =>
  import('@/features/league-admin/fixtures/fixtures-page').then((m) => ({
    default: (props: { leagueId: string }) => <m.FixturesPage {...props} />,
  })),
)

const PlayoffsPage = lazy(() =>
  import('@/features/league-admin/fixtures/playoffs-page').then((m) => ({
    default: (props: { leagueId: string }) => <m.PlayoffsPage {...props} />,
  })),
)

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>
}

/** Routes and navigation for fixtures & playoffs management. */
export const area: Area = {
  dashboardRoutes: {
    roles: ['league_admin', 'super_admin'],
    routes: [
      {
        path: 'liga-admin/fixtures',
        element: (
          <Lazy>
            <FixturesPage leagueId="default" />
          </Lazy>
        ),
      },
      {
        path: 'liga-admin/playoffs',
        element: (
          <Lazy>
            <PlayoffsPage leagueId="default" />
          </Lazy>
        ),
      },
    ],
  },
  nav: [
    { to: '/liga-admin/fixtures', label: 'Fixtures', roles: ['league_admin'] },
    { to: '/liga-admin/playoffs', label: 'Playoffs', roles: ['league_admin'] },
  ],
}
