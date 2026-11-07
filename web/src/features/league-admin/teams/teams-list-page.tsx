import React, { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, QueryState } from '@/components/states'
import { useMyLeagues } from '@/features/leagues/api'
import { useTeamsByLeague } from './api'
import { CreateTeamDialog } from './components/create-team-dialog'
import { TeamsTable } from './components/teams-table'

export function TeamsListPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const hasSelectedRef = React.useRef(false)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(() => {
    // Initialize from first league if available
    return ''
  })
  const leaguesQuery = useMyLeagues()
  const teamsQuery = useTeamsByLeague(selectedLeagueId)

  // Auto-select first league if available and not yet selected
  React.useEffect(() => {
    const firstLeague = leaguesQuery.data?.data?.[0]
    if (!selectedLeagueId && firstLeague && !hasSelectedRef.current) {
      hasSelectedRef.current = true
      setSelectedLeagueId(firstLeague.id)
    }
  }, [selectedLeagueId, leaguesQuery.data])

  return (
    <div className="space-y-6 py-6">
      <QueryState
        query={leaguesQuery}
        isEmpty={(data) => data.data.length === 0}
        loadingLabel="Cargando ligas…"
        empty={<EmptyState title="No hay ligas" description="No administras ninguna liga" />}
        children={(leaguesRes) => (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Equipos</h1>
                <p className="text-muted-foreground mt-1">Administra los equipos de la liga</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Crear equipo
              </Button>
            </div>

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
              query={teamsQuery}
              isEmpty={(data) => data.data.length === 0}
              loadingLabel="Cargando equipos…"
              children={(res) => <TeamsTable teams={res.data} />}
            />

            <CreateTeamDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} leagueId={selectedLeagueId} />
          </>
        )}
      />
    </div>
  )
}
