import { lazy, Suspense } from 'react'

import type { Area } from '@/app/area'
import { EmptyState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { useMyLeagues } from '@/features/leagues/api'
import { useLeagueSelector } from '@/features/league-admin/use-league-selector'

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

/**
 * Wrapper that loads user's leagues and shows either a league selector
 * (if multiple), the fixtures page (if one), or an empty state (if none).
 */
function FixturesWrapper() {
  const leagues = useMyLeagues()
  const { selectedLeagueId, setSelectedLeagueId } = useLeagueSelector('fixtures')

  if (leagues.isLoading) return <LoadingState />

  if (!leagues.data?.data.length) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <EmptyState
          title="Sin ligas"
          description="Tu cuenta no administra ninguna liga. Crea una o pide que te agreguen como administrador."
        />
      </section>
    )
  }

  if (leagues.data.data.length > 1) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Selecciona una liga</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.data.data.map((league) => (
            <Button
              key={league.id}
              variant="outline"
              className="h-auto flex-col items-start gap-2 p-4"
              onClick={() => {
                setSelectedLeagueId(league.id)
              }}
            >
              <span className="font-semibold">{league.name}</span>
              <span className="text-xs text-muted-foreground">{league.slug}</span>
            </Button>
          ))}
        </div>
      </section>
    )
  }

  const leagueId = selectedLeagueId || leagues.data.data[0]!.id
  return (
    <Lazy>
      <FixturesPage leagueId={leagueId} />
    </Lazy>
  )
}

/**
 * Wrapper that loads user's leagues and shows either a league selector
 * (if multiple), the playoffs page (if one), or an empty state (if none).
 */
function PlayoffsWrapper() {
  const leagues = useMyLeagues()
  const { selectedLeagueId, setSelectedLeagueId } = useLeagueSelector('playoffs')

  if (leagues.isLoading) return <LoadingState />

  if (!leagues.data?.data.length) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <EmptyState
          title="Sin ligas"
          description="Tu cuenta no administra ninguna liga. Crea una o pide que te agreguen como administrador."
        />
      </section>
    )
  }

  if (leagues.data.data.length > 1) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Selecciona una liga</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.data.data.map((league) => (
            <Button
              key={league.id}
              variant="outline"
              className="h-auto flex-col items-start gap-2 p-4"
              onClick={() => {
                setSelectedLeagueId(league.id)
              }}
            >
              <span className="font-semibold">{league.name}</span>
              <span className="text-xs text-muted-foreground">{league.slug}</span>
            </Button>
          ))}
        </div>
      </section>
    )
  }

  const leagueId = selectedLeagueId || leagues.data.data[0]!.id
  return (
    <Lazy>
      <PlayoffsPage leagueId={leagueId} />
    </Lazy>
  )
}

/** Routes and navigation for fixtures & playoffs management. */
export const area: Area = {
  dashboardRoutes: {
    roles: ['league_admin', 'super_admin'],
    routes: [
      {
        path: 'liga-admin/fixtures',
        element: <FixturesWrapper />,
      },
      {
        path: 'liga-admin/playoffs',
        element: <PlayoffsWrapper />,
      },
    ],
  },
  nav: [
    { to: '/liga-admin/fixtures', label: 'Fixtures', roles: ['league_admin'] },
    { to: '/liga-admin/playoffs', label: 'Playoffs', roles: ['league_admin'] },
  ],
}
