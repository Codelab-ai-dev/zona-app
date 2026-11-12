import { Calendar, Hand, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QueryState, EmptyState } from '@/components/states'

import { useLeagueTournaments } from '@/features/leagues/api'
import { useTeamsByLeague } from './api'
import { FixtureWizard } from './fixture-wizard'
import { ManualRoundDialog } from './components/manual-round-dialog'

interface FixturesPageProps {
  leagueId: string
}

/**
 * Fixtures management page for league admins.
 * Shows button to generate fixtures and loads teams from the API.
 */
export function FixturesPage({ leagueId }: FixturesPageProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isManualOpen, setIsManualOpen] = useState(false)

  const tournaments = useLeagueTournaments(leagueId)
  const teams = useTeamsByLeague(leagueId)

  // Filter active teams from the current tournament (if selected)
  const getActiveTeams = useMemo(() => {
    return (tournamentId?: string) => {
      if (!teams.data?.data) return []
      return teams.data.data
        .filter((team) => team.is_active)
        .filter((team) => !tournamentId || !team.tournament_id || team.tournament_id === tournamentId)
    }
  }, [teams.data])

  return (
    <section className="space-y-6 py-6">
      <Card className="border-white/10 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5" aria-hidden="true" />
            <h1>Generador de Jornadas</h1>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Genera automáticamente el calendario completo de partidos para el torneo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <p className="text-sm text-gray-400">
                <strong>Equipos activos:</strong> {getActiveTeams().length}
              </p>
              <p className="text-sm text-gray-400">
                <strong>Torneos activos:</strong> {(tournaments.data?.data ?? []).filter((t) => t.is_active).length}
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="border-0 bg-green-500/80 text-white shadow-lg backdrop-blur-md hover:bg-green-500/90">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Generar Jornadas
            </Button>
            <Button onClick={() => setIsManualOpen(true)} className="border border-orange-500/50 bg-transparent text-orange-400 hover:bg-orange-500/20">
              <Hand className="mr-2 h-4 w-4" aria-hidden="true" />
              Modo Manual
            </Button>
          </div>
        </CardContent>
      </Card>

      <ManualRoundDialog
        open={isManualOpen}
        onOpenChange={setIsManualOpen}
        tournaments={tournaments.data?.data ?? []}
        getActiveTeams={getActiveTeams}
        leagueId={leagueId}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm text-white md:text-lg">
              <Calendar className="h-4 w-4 text-green-400 md:h-5 md:w-5" aria-hidden="true" />
              Generar Jornadas
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 md:text-sm">
              El algoritmo de round-robin generará automáticamente el calendario para tu torneo.
            </DialogDescription>
          </DialogHeader>

          <QueryState
            query={tournaments}
            isEmpty={(res) => res.data.length === 0}
            empty={
              <EmptyState
                title="Sin torneos"
                description="Crea un torneo antes de generar fixtures."
              />
            }
          >
            {(res) => (
              <QueryState
                query={teams}
                isEmpty={(res) => res.data.length === 0}
                empty={
                  <EmptyState
                    title="Sin equipos"
                    description="Registra equipos antes de generar fixtures."
                  />
                }
              >
                {() => (
                  <FixtureWizard
                    tournaments={res.data}
                    getActiveTeams={getActiveTeams}
                    onSuccess={() => setIsDialogOpen(false)}
                  />
                )}
              </QueryState>
            )}
          </QueryState>
        </DialogContent>
      </Dialog>
    </section>
  )
}
