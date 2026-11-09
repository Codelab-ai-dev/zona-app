import { useState } from 'react'
import { Plus, Shield } from 'lucide-react'

import { EmptyState, QueryState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLeagueTournaments } from '@/features/leagues/api'

import { useLeagueUserNames, useTeamsByLeague } from './api'
import { CreateTeamDialog } from './components/create-team-dialog'
import { LeaguePicker } from './components/league-picker'
import { TeamsTable } from './components/teams-table'
import { useSelectedLeague } from './use-selected-league'

import type { Team } from './types'

const filterTeams = (teams: Team[], filter: string) => {
  if (filter === 'all') return teams
  if (filter === 'none') return teams.filter((t) => !t.tournament_id)
  return teams.filter((t) => t.tournament_id === filter)
}

function EmptyTeams({ total }: { total: number }) {
  return (
    <div className="py-12 text-center">
      <Shield className="mx-auto mb-4 h-12 w-12 text-white/50 drop-shadow" aria-hidden="true" />
      <h3 className="mb-2 text-base font-medium text-white drop-shadow-lg sm:text-lg">
        {total === 0 ? 'No hay equipos registrados' : 'No hay equipos en este torneo'}
      </h3>
      <p className="text-white/80 drop-shadow">
        {total === 0 ? 'Los equipos aparecerán aquí cuando se registren en tu liga' : 'Selecciona otro torneo o agrega equipos a este torneo'}
      </p>
    </div>
  )
}

export function TeamsListPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const { leaguesQuery, leagueId, setLeagueId } = useSelectedLeague()
  const teamsQuery = useTeamsByLeague(leagueId)
  const ownerNames = useLeagueUserNames(leagueId).data
  const tournaments = useLeagueTournaments(leagueId).data?.data ?? []
  const tournamentNames = Object.fromEntries(tournaments.map((t) => [t.id, t.name]))

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-lg font-bold text-white drop-shadow-lg sm:text-2xl">Gestión de Equipos</h1>
                <p className="text-xs text-white/80 drop-shadow sm:text-base">Administra los equipos de tu liga</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} className="h-9 bg-green-500 text-xs text-white hover:bg-green-600 md:text-sm">
                <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Agregar Equipo
              </Button>
            </div>

            <LeaguePicker leagues={leaguesRes.data} value={leagueId} onChange={setLeagueId} />

            <QueryState
              query={teamsQuery}
              isEmpty={(data) => data.data.length === 0}
              loadingLabel="Cargando equipos…"
              empty={<EmptyTeams total={0} />}
            >
              {(res) => {
                const shown = filterTeams(res.data, filter)
                return (
                  <>
                    <div className="flex items-center gap-4">
                      <Label htmlFor="tournament-filter" className="whitespace-nowrap text-white/90 drop-shadow">
                        Filtrar por torneo:
                      </Label>
                      <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger id="tournament-filter" className="w-64 rounded-lg border-white/30 bg-white/10 text-white backdrop-blur-md">
                          <SelectValue placeholder="Todos los torneos" />
                        </SelectTrigger>
                        <SelectContent className="border-white/20 bg-gray-700/95 backdrop-blur-xl">
                          <SelectItem value="all" className="text-white">Todos los equipos</SelectItem>
                          <SelectItem value="none" className="text-white">Sin torneo asignado</SelectItem>
                          {tournaments.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-white">{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-white/70 drop-shadow">
                        {shown.length} equipo{shown.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {shown.length === 0 ? <EmptyTeams total={res.data.length} /> : <TeamsTable teams={shown} tournamentNames={tournamentNames} ownerNames={ownerNames} />}
                  </>
                )
              }}
            </QueryState>

            <CreateTeamDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} leagueId={leagueId} />
          </>
        )}
      </QueryState>
    </div>
  )
}
