import { AlertTriangle } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { Tournament } from '@/features/leagues/types'

import type { GenerateFixturesRequest } from './types'
import { useDuplicateMatches, useGenerateFixtures, useTournamentMatches } from './api'

interface FixtureWizardProps {
  tournaments: Tournament[]
  teams: Array<{ id: string; name: string }>
  onSuccess?: () => void
}

type Step = 'select' | 'options' | 'confirm'

/**
 * Multi-step wizard for generating fixtures. Shows tournament selection,
 * team selection, options, and confirmation before calling the API.
 */
export function FixtureWizard({ tournaments, teams, onSuccess }: FixtureWizardProps) {
  const [step, setStep] = useState<Step>('select')
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set(teams.map((t) => t.id)))
  const [isDoubleRound, setIsDoubleRound] = useState(false)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const filteredTeams = teams.filter((t) => selectedTeams.has(t.id))

  const duplicates = useDuplicateMatches(selectedTournamentId)
  const existingMatches = useTournamentMatches(selectedTournamentId)
  const generateFixtures = useGenerateFixtures()

  const hasDuplicates = (duplicates.data?.length ?? 0) > 0
  const hasExistingMatches = (existingMatches.data?.data.length ?? 0) > 0

  const handleSelectTeam = useCallback(
    (teamId: string, checked: boolean) => {
      const newSet = new Set(selectedTeams)
      if (checked) {
        newSet.add(teamId)
      } else {
        newSet.delete(teamId)
      }
      setSelectedTeams(newSet)
    },
    [selectedTeams],
  )

  const handleGenerateClick = async () => {
    if (!selectedTournamentId) return

    if (hasDuplicates && !confirmOverwrite) {
      setStep('confirm')
      return
    }

    const req: GenerateFixturesRequest = {
      tournament_id: selectedTournamentId,
      teams: filteredTeams,
      is_double_round: isDoubleRound,
    }

    await generateFixtures.mutateAsync(req)
    onSuccess?.()
    // Reset wizard
    setStep('select')
    setSelectedTournamentId('')
    setConfirmOverwrite(false)
  }

  if (step === 'confirm' && hasDuplicates) {
    return (
      <div className="space-y-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 flex-shrink-0 text-warning" aria-hidden="true" />
          <div className="space-y-2">
            <h3 className="font-medium">Partidos duplicados encontrados</h3>
            <p className="text-sm text-muted-foreground">
              Se encontraron {duplicates.data?.length} duplicados. Genera de todas formas para reemplazarlos.
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('options')} size="sm">
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setConfirmOverwrite(true)
                  handleGenerateClick()
                }}
                disabled={generateFixtures.isPending}
                size="sm"
              >
                {generateFixtures.isPending ? 'Generando…' : 'Generar de todas formas'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'options') {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="tournament-select" className="text-base font-semibold">
            Selecciona el torneo
          </Label>
          <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
            <SelectTrigger id="tournament-select">
              <SelectValue placeholder="Elige un torneo" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">Opciones</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              id="double-round"
              checked={isDoubleRound}
              onCheckedChange={(checked) => setIsDoubleRound(Boolean(checked))}
            />
            <Label htmlFor="double-round" className="font-normal">
              Ida y vuelta (doblete)
            </Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep('select')}>
            Atrás
          </Button>
          <Button onClick={() => setStep('confirm')} disabled={!selectedTournamentId || filteredTeams.length < 2}>
            Siguiente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="tournament-select" className="text-base font-semibold">
          Selecciona el torneo
        </Label>
        <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
          <SelectTrigger id="tournament-select">
            <SelectValue placeholder="Elige un torneo" />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{tournaments.length} torneos disponibles</p>
      </div>

      {selectedTournamentId && (
        <>
          {hasExistingMatches && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Este torneo ya tiene {existingMatches.data?.data.length} partidos. Se generarán partidos nuevos además de los
                existentes.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Equipos ({selectedTeams.size}/{teams.length})
            </Label>
            <ScrollArea className="border rounded-lg p-3 h-64">
              <div className="space-y-2 pr-4">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`team-${team.id}`}
                      checked={selectedTeams.has(team.id)}
                      onCheckedChange={(checked) => handleSelectTeam(team.id, Boolean(checked))}
                    />
                    <Label htmlFor={`team-${team.id}`} className="font-normal cursor-pointer">
                      {team.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              Se requieren mínimo 2 equipos. Se generarán {selectedTeams.size > 1 ? selectedTeams.size - 1 : 0} jornadas.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedTournamentId('')}>
              Atrás
            </Button>
            <Button onClick={() => setStep('options')} disabled={selectedTeams.size < 2}>
              Siguiente
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
