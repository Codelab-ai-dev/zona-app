import { useState } from 'react'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QueryState } from '@/components/states'
import { useLeagueTournaments } from '@/features/leagues/api'
import { useAuth } from '@/lib/auth/auth-context'
import { usePlayerRegistrationRequests, useReviewPlayerRegistration } from './api'
import { RequestsTable } from './components/requests-table'

export function RequestsPage() {
  const [tournamentId, setTournamentId] = useState<string>('')
  const { profile } = useAuth()
  const leagueId = profile?.league_id ?? ''

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
  )
}
