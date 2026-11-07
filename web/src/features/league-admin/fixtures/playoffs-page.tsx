import { Clock, Trophy } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

import { useLeagueTournaments } from '@/features/leagues/api'
import { QueryState } from '@/components/states'
import { ApiError } from '@/lib/api/client'

import { useGeneratePlayoffs, useTournamentMatches } from './api'
import { PlayoffBracket } from './playoff-bracket'
import type { GeneratePlayoffsRequest } from './types'

interface PlayoffsPageProps {
  leagueId: string
}

/**
 * Playoffs management page for league admins.
 * Shows button to generate playoff bracket and displays the bracket visualization.
 */
export function PlayoffsPage({ leagueId }: PlayoffsPageProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [numTeams, setNumTeams] = useState<'4' | '8'>('8')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [fieldNumber, setFieldNumber] = useState('1')
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState(true)
  const [homeAndAway, setHomeAndAway] = useState(false)

  const tournaments = useLeagueTournaments(leagueId)
  const playoffMatches = useTournamentMatches(selectedTournamentId, { phase: 'playoffs' })
  const generatePlayoffs = useGeneratePlayoffs()

  const [errors, setErrors] = useState<Record<string, string>>({})
  const clearError = (field: string) =>
    setErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  const errorProps = (field: string) => ({
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  })
  const errorText = (field: string) =>
    errors[field] ? (
      <p id={`${field}-error`} className="text-xs text-destructive">
        {errors[field]}
      </p>
    ) : null

  const handleGenerate = async () => {
    if (!selectedTournamentId) return

    const req: GeneratePlayoffsRequest = {
      tournament_id: selectedTournamentId,
      num_teams: parseInt(numTeams, 10) as 4 | 8,
      start_date: startDate,
      start_time: startTime,
      field_number: parseInt(fieldNumber, 10) || 0,
      third_place_match: thirdPlaceMatch,
      home_and_away: homeAndAway,
    }

    try {
      await generatePlayoffs.mutateAsync(req)
      setErrors({})
      setIsDialogOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) setErrors(err.fields)
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-8 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Llave de Playoffs</h1>
          <p className="text-muted-foreground">Genera y gestiona la llave de eliminación</p>
        </div>

        <Button onClick={() => setIsDialogOpen(true)} size="lg" className="gap-2">
          <Trophy className="h-4 w-4" />
          Generar Llave
        </Button>
      </header>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Llave de Playoffs</DialogTitle>
            <DialogDescription>
              Configura los parámetros para generar automáticamente la llave de eliminación.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tournament-select">Torneo</Label>
              <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
                <SelectTrigger id="tournament-select" {...errorProps('tournament_id')}>
                  <SelectValue placeholder="Elige un torneo" />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.data?.data.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errorText('tournament_id')}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="num-teams">Equipos</Label>
                <Select value={numTeams} onValueChange={(v) => setNumTeams(v as '4' | '8')}>
                  <SelectTrigger id="num-teams" {...errorProps('num_teams')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 equipos</SelectItem>
                    <SelectItem value="8">8 equipos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Inicio</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    clearError('start_date')
                  }}
                  {...errorProps('start_date')}
                />
                {errorText('start_date')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_time" className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Hora
                </Label>
                <Input
                  id="start_time"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value)
                    clearError('start_time')
                  }}
                  {...errorProps('start_time')}
                />
                {errorText('start_time')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="field_number">Cancha</Label>
                <Input
                  id="field_number"
                  type="number"
                  min="1"
                  value={fieldNumber}
                  onChange={(e) => {
                    setFieldNumber(e.target.value)
                    clearError('field_number')
                  }}
                  {...errorProps('field_number')}
                />
                {errorText('field_number')}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="third-place"
                  checked={thirdPlaceMatch}
                  onCheckedChange={(checked) => setThirdPlaceMatch(Boolean(checked))}
                />
                <Label htmlFor="third-place" className="font-normal">
                  Partido por tercer lugar
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="home-away"
                  checked={homeAndAway}
                  onCheckedChange={(checked) => setHomeAndAway(Boolean(checked))}
                />
                <Label htmlFor="home-away" className="font-normal">
                  Ida y vuelta
                </Label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generatePlayoffs.isPending || !selectedTournamentId || !startDate}
                className="flex-1"
              >
                {generatePlayoffs.isPending ? 'Generando…' : 'Generar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bracket visualization */}
      <div className="mt-12">
        <h2 className="mb-6 text-lg font-semibold">Llave Generada</h2>

        {selectedTournamentId ? (
          <QueryState
            query={playoffMatches}
            isEmpty={(res) => res.data.length === 0}
            empty={
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No hay llave generada aún. Usa el botón arriba para crear una.
                </CardContent>
              </Card>
            }
          >
            {(res) => <PlayoffBracket matches={res.data} />}
          </QueryState>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Selecciona un torneo arriba para ver su llave
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}
