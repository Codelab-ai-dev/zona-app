import { useState } from 'react'
import { Plus } from 'lucide-react'

import { EmptyState, QueryState } from '@/components/states'
import { Button } from '@/components/ui/button'

import { useTeamsByLeague } from './api'
import { CreateTeamDialog } from './components/create-team-dialog'
import { LeaguePicker } from './components/league-picker'
import { TeamsTable } from './components/teams-table'
import { useSelectedLeague } from './use-selected-league'

export function TeamsListPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { leaguesQuery, leagueId, setLeagueId } = useSelectedLeague()
  const teamsQuery = useTeamsByLeague(leagueId)

  return (
    <div className="space-y-6 py-6">
      <QueryState
        query={leaguesQuery}
        isEmpty={(data) => data.data.length === 0}
        loadingLabel="Cargando ligas…"
        empty={<EmptyState title="No hay ligas" description="No administras ninguna liga" />}
      >
        {(leaguesRes) => (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Equipos</h1>
                <p className="text-muted-foreground mt-1">Administra los equipos de la liga</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="size-4" aria-hidden="true" />
                Crear equipo
              </Button>
            </div>

            <LeaguePicker leagues={leaguesRes.data} value={leagueId} onChange={setLeagueId} />

            <QueryState
              query={teamsQuery}
              isEmpty={(data) => data.data.length === 0}
              loadingLabel="Cargando equipos…"
              empty={<EmptyState title="No hay equipos" description="Crea el primer equipo de la liga" />}
            >
              {(res) => <TeamsTable teams={res.data} />}
            </QueryState>

            <CreateTeamDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} leagueId={leagueId} />
          </>
        )}
      </QueryState>
    </div>
  )
}
