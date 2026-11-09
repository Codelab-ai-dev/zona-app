import { EmptyState, ErrorState, LoadingState, QueryState } from '@/components/states'
import { useLeagueTournaments } from '@/features/leagues/api'

import { useLeagueRegistrationRequests, useLeagueUserNames, useReviewPlayerRegistration, useTeamsByLeague } from './api'
import { LeaguePicker } from './components/league-picker'
import { RequestsTable } from './components/requests-table'
import { useSelectedLeague } from './use-selected-league'

function LeagueRequests({ leagueId, tournamentIds }: { leagueId: string; tournamentIds: string[] }) {
  const { requests, isPending, error, refetch } = useLeagueRegistrationRequests(tournamentIds)
  const teams = useTeamsByLeague(leagueId).data?.data ?? []
  const review = useReviewPlayerRegistration()
  const userNames = useLeagueUserNames(leagueId).data
  const teamNames = Object.fromEntries(teams.map((t) => [t.id, t.name]))

  if (isPending) return <LoadingState label="Cargando solicitudes..." />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  return (
    <RequestsTable
      requests={requests}
      teamNames={teamNames}
      userNames={userNames}
      isPending={review.isPending}
      onReview={(requestId, status, notes) =>
        review.mutateAsync({ requestId, review: { status, review_notes: notes } }).then(
          () => true,
          () => false,
        )
      }
    />
  )
}

export function RequestsPage() {
  const { leaguesQuery, leagueId, setLeagueId } = useSelectedLeague()
  const tournamentsQuery = useLeagueTournaments(leagueId)

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Solicitudes de Jugadores Excepcionales</h1>
        <p className="text-gray-400">Revisa y aprueba solicitudes de registro fuera del periodo normal</p>
      </div>

      <QueryState
        query={leaguesQuery}
        isEmpty={(data) => data.data.length === 0}
        loadingLabel="Cargando ligas…"
        empty={<EmptyState title="No hay ligas" description="No administras ninguna liga" />}
      >
        {(leaguesRes) => (
          <div className="space-y-6">
            <LeaguePicker leagues={leaguesRes.data} value={leagueId} onChange={setLeagueId} />

            <QueryState
              query={tournamentsQuery}
              isEmpty={(data) => data.data.length === 0}
              loadingLabel="Cargando solicitudes..."
              empty={<EmptyState title="No hay torneos" description="Esta liga aún no tiene torneos" />}
            >
              {(res) => <LeagueRequests leagueId={leagueId} tournamentIds={res.data.map((t) => t.id)} />}
            </QueryState>
          </div>
        )}
      </QueryState>
    </div>
  )
}
