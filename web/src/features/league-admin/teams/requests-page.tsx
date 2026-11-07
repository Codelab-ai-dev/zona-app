import { useState } from 'react'

import { EmptyState, QueryState } from '@/components/states'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLeagueTournaments } from '@/features/leagues/api'

import { usePlayerRegistrationRequests, useReviewPlayerRegistration } from './api'
import { LeaguePicker } from './components/league-picker'
import { RequestsTable } from './components/requests-table'
import { useSelectedLeague } from './use-selected-league'

export function RequestsPage() {
  const { leaguesQuery, leagueId, setLeagueId } = useSelectedLeague()
  // The tournament choice belongs to a league: switching league clears it.
  const [choice, setChoice] = useState({ leagueId: '', tournamentId: '' })
  const tournamentId = choice.leagueId === leagueId ? choice.tournamentId : ''
  const tournamentsQuery = useLeagueTournaments(leagueId)
  const requestsQuery = usePlayerRegistrationRequests(tournamentId)
  const reviewMutation = useReviewPlayerRegistration()

  return (
    <div className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Solicitudes de Registros</h1>
        <p className="text-muted-foreground mt-1">Aprueba o rechaza solicitudes de jugadores</p>
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
              loadingLabel="Cargando torneos…"
              empty={<EmptyState title="No hay torneos" description="Esta liga aún no tiene torneos" />}
            >
              {(res) => (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="tournament">Torneo</Label>
                    <Select value={tournamentId} onValueChange={(id) => setChoice({ leagueId, tournamentId: id })}>
                      <SelectTrigger id="tournament">
                        <SelectValue placeholder="Selecciona un torneo" />
                      </SelectTrigger>
                      <SelectContent>
                        {res.data.map((tournament) => (
                          <SelectItem key={tournament.id} value={tournament.id}>
                            {tournament.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {tournamentId && (
                    <QueryState
                      query={requestsQuery}
                      isEmpty={(data) => data.data.length === 0}
                      loadingLabel="Cargando solicitudes…"
                      empty={<EmptyState title="No hay solicitudes" description="Este torneo no tiene solicitudes" />}
                    >
                      {(requestsRes) => (
                        <RequestsTable
                          requests={requestsRes.data}
                          isPending={reviewMutation.isPending}
                          onReview={(requestId, status, notes) =>
                            reviewMutation.mutate({ requestId, review: { status, review_notes: notes } })
                          }
                        />
                      )}
                    </QueryState>
                  )}
                </div>
              )}
            </QueryState>
          </div>
        )}
      </QueryState>
    </div>
  )
}
