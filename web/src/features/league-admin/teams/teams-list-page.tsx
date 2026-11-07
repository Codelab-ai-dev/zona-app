import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { QueryState } from '@/components/states'
import { useAuth } from '@/lib/auth/auth-context'
import { useTeamsByLeague } from './api'
import { CreateTeamDialog } from './components/create-team-dialog'
import { TeamsTable } from './components/teams-table'

export function TeamsListPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { profile } = useAuth()
  const leagueId = profile?.league_id ?? ''

  const teamsQuery = useTeamsByLeague(leagueId)

  return (
    <div className="space-y-6 py-6">
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

      <QueryState
        query={teamsQuery}
        isEmpty={(data) => data.data.length === 0}
        loadingLabel="Cargando equipos…"
        children={(res) => <TeamsTable teams={res.data} />}
      />

      <CreateTeamDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} leagueId={leagueId} />
    </div>
  )
}
