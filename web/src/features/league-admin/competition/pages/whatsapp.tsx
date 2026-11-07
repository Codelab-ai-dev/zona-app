import { useMyLeagues } from '@/features/leagues/api'
import { EmptyState, QueryState } from '@/components/states'
import { WhatsAppPage } from '../components'

export function WhatsAppPageComponent() {
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
        return <WhatsAppPage leagueId={league.id} />
      }}
    </QueryState>
  )
}
