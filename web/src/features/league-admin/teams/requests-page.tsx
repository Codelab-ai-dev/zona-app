import React, { useState } from 'react'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, QueryState } from '@/components/states'
import { useLeagueTournaments, useMyLeagues } from '@/features/leagues/api'
import { usePlayerRegistrationRequests, useReviewPlayerRegistration } from './api'
import { RequestsTable } from './components/requests-table'

export function RequestsPage() {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('')
  const [tournamentId, setTournamentId] = useState<string>('')
  const hasSelectedRef = React.useRef(false)
  const leaguesQuery = useMyLeagues()
  const tournamentsQuery = useLeagueTournaments(selectedLeagueId)
  const requestsQuery = usePlayerRegistrationRequests(tournamentId)
  const reviewMutation = useReviewPlayerRegistration()

  // Auto-select first league if available
  React.useEffect(() => {
    const firstLeague = leaguesQuery.data?.data?.[0]
    if (!selectedLeagueId && firstLeague && !hasSelectedRef.current) {
      hasSelectedRef.current = true
      setSelectedLeagueId(firstLeague.id)
    }
  }, [selectedLeagueId, leaguesQuery.data])

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
        children={(leaguesRes) => (
          <div className="space-y-6">
            {leaguesRes.data.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="league-select">Selecciona una liga</Label>
                <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                  <SelectTrigger id="league-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaguesRes.data.map((league) => (
                      <SelectItem key={league.id} value={league.id}>
                        {league.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <QueryState
              query={tournamentsQuery}
              isEmpty={(data) => data.data.length === 0}
              loadingLabel="Cargando torneos…"
              children={(res) => (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="tournament">Torneo</Label>
                    <Select value={tournamentId} onValueChange={setTournamentId}>
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
                      children={(requestsRes) => (
                        <RequestsTable
                          requests={requestsRes.data}
                          isPending={reviewMutation.isPending}
                          onReview={async (requestId, status, notes) => {
                            await reviewMutation.mutateAsync({
                              requestId,
                              review: { status, review_notes: notes },
                            })
                          }}
                        />
                      )}
                    />
                  )}
                </div>
              )}
            />
          </div>
        )}
      />
    </div>
  )
}
