import { Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
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

interface FixturesPageProps {
  leagueId: string
}

/**
 * Fixtures management page for league admins.
 * Shows button to generate fixtures and loads teams from the API.
 */
export function FixturesPage({ leagueId }: FixturesPageProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

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
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generador de Fixtures</h1>
          <p className="text-muted-foreground">Crea automáticamente el calendario de tu torneo</p>
        </div>

        <Button onClick={() => setIsDialogOpen(true)} size="lg" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generar Fixtures
        </Button>
      </header>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generar Fixtures</DialogTitle>
            <DialogDescription>
              El algoritmo de round-robin generará automáticamente el calendario para tu torneo.
            </DialogDescription>
          </DialogHeader>

          <QueryState
            query={tournaments}
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
