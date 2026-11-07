import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useLeagueTournaments } from '@/features/leagues/api'
import { useAuth } from '@/lib/auth/auth-context'

import { FixtureWizard } from './fixture-wizard'

interface FixturesPageProps {
  leagueId: string
}

/**
 * Fixtures management page for league admins.
 * Shows button to generate fixtures and lists existing fixtures.
 */
export function FixturesPage({ leagueId }: FixturesPageProps) {
  const { profile } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const tournaments = useLeagueTournaments(leagueId)

  // For now, use tournament data as mock team data (will be replaced with team API)
  const mockTeams =
    tournaments.data?.data.slice(0, 1).map((_, i) => ({
      id: `team-${i}`,
      name: `Equipo ${i + 1}`,
    })) ?? []

  if (!profile) return null

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Fixtures</DialogTitle>
            <DialogDescription>
              El algoritmo de round-robin generará automáticamente el calendario para tu torneo.
            </DialogDescription>
          </DialogHeader>

          {tournaments.data?.data && (
            <FixtureWizard
              tournaments={tournaments.data.data}
              teams={mockTeams}
              onSuccess={() => setIsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
