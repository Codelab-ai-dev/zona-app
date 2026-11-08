import { Plus, Trophy } from 'lucide-react'
import { useState } from 'react'

import { QueryState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLeagueTournaments } from '@/features/leagues/api'

import { useTeamsByLeague, useTournamentMatches } from './api'
import { PlayoffGenerateDialog } from './components/playoff-generate-dialog'
import { PlayoffBracket } from './playoff-bracket'

interface PlayoffsPageProps {
  leagueId: string
}

const LABELS = {
  knockout: {
    title: 'Fase de Eliminación Directa',
    description: 'Configura y genera el bracket de eliminación directa',
    button: 'Generar Eliminación',
    how: '¿Cómo funciona la Eliminación Directa?',
  },
  group_knockout: {
    title: 'Fase de Eliminación',
    description: 'Configura y genera el bracket de eliminación para los equipos clasificados de la fase de grupos',
    button: 'Generar Eliminación',
    how: '¿Cómo funciona la Fase de Eliminación?',
  },
  league: {
    title: 'Fase de Liguilla',
    description: 'Configura y genera el bracket de playoffs al finalizar la fase regular',
    button: 'Generar Liguilla',
    how: '¿Cómo funciona la Liguilla?',
  },
} as const

const STEPS = [
  ['1. Finaliza la fase regular:', 'Asegúrate de que todos los partidos estén finalizados y los resultados ingresados correctamente.'],
  ['2. Genera la liguilla:', 'Elige el torneo, el número de equipos (4 u 8) y la fecha de inicio.'],
  ['3. Formato automático:', 'Los emparejamientos se crean automáticamente: 1° vs 8°, 2° vs 7°, etc. (para 8 equipos) o 1° vs 4°, 2° vs 3° (para 4 equipos).'],
]

/** Playoffs management page for league admins: generate the bracket and see it. */
export function PlayoffsPage({ leagueId }: PlayoffsPageProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTournamentId, setSelectedTournamentId] = useState('')

  const tournaments = useLeagueTournaments(leagueId)
  const teams = useTeamsByLeague(leagueId)
  const playoffMatches = useTournamentMatches(selectedTournamentId, { phase: 'playoffs' })
  const tournamentList = tournaments.data?.data ?? []
  const format = tournamentList.find((t) => t.id === selectedTournamentId)?.tournament_format
  const labels = LABELS[format === 'knockout' || format === 'group_knockout' ? format : 'league']
  const teamNames = Object.fromEntries((teams.data?.data ?? []).map((t) => [t.id, t.name]))

  return (
    <section className="space-y-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white drop-shadow-lg sm:text-2xl">{labels.title}</h1>
          <p className="text-white/80 drop-shadow">{labels.description}</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="border-0 bg-yellow-500/80 text-white shadow-lg backdrop-blur-md hover:bg-yellow-500/90">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {labels.button}
        </Button>
      </div>

      <PlayoffGenerateDialog
        leagueId={leagueId}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        tournaments={tournamentList}
        tournamentId={selectedTournamentId}
        onTournamentChange={setSelectedTournamentId}
        title={`Configurar ${labels.title.replace('Fase de ', '')}`}
        description="Configura los parámetros para generar automáticamente la llave de eliminación."
      />

      <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white drop-shadow-lg">Llave Generada</CardTitle>
          <CardDescription className="text-white/80 drop-shadow">Elige el torneo para ver su llave</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label htmlFor="bracket-tournament" className="text-white/90">Ver llave del torneo</Label>
            <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
              <SelectTrigger id="bracket-tournament" className="w-full rounded-lg border-white/30 bg-white/10 text-white backdrop-blur-md">
                <SelectValue placeholder="Selecciona un torneo" />
              </SelectTrigger>
              <SelectContent className="border-white/20 bg-gray-700/95 backdrop-blur-xl">
                {tournamentList.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-white">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTournamentId ? (
            <QueryState
              query={playoffMatches}
              isEmpty={(res) => res.data.length === 0}
              empty={<p className="py-6 text-center text-white/70">No hay llave generada aún. Usa el botón arriba para crear una.</p>}
            >
              {(res) => <PlayoffBracket matches={res.data} teamNames={teamNames} />}
            </QueryState>
          ) : (
            <p className="py-6 text-center text-white/70">Selecciona un torneo arriba para ver su llave</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/20 bg-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
            <Trophy className="h-5 w-5 text-yellow-300" aria-hidden="true" />
            {labels.how}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-white/80 drop-shadow">
          {STEPS.map(([lead, text]) => (
            <p key={lead}>
              <strong className="text-white">{lead}</strong> {text}
            </p>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
