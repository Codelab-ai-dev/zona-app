import { useMyLeagues } from '@/features/leagues/api'
import { EmptyState, QueryState } from '@/components/states'
import { StandingsPage } from '../components'

export function StandingsPageComponent() {
  const leagues = useMyLeagues()

  return (
    <QueryState
      query={leagues}
      loadingLabel="Cargando ligas…"
      isEmpty={(res) => (res?.data?.length ?? 0) === 0}
      empty={<EmptyState title="Sin liga asignada" description="No tienes ligas para administrar" />}
    >
      {(res) => {
        const league = res?.data?.[0]
        if (!league) return <EmptyState title="Sin liga asignada" />
        return <StandingsPage leagueId={league.id} />
      }}
    </QueryState>
  )
}
