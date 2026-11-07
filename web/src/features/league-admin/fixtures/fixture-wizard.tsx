import { AlertTriangle, Clock } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { Tournament } from '@/features/leagues/types'

import type { GenerateFixturesRequest, FixtureSchedule } from './types'
import { useDuplicateMatches, useGenerateFixtures, useTournamentMatches } from './api'
import { ApiError } from '@/lib/api/client'

interface FixtureWizardProps {
  tournaments: Tournament[]
  getActiveTeams: (tournamentId?: string) => Array<{ id: string; name: string; is_active: boolean }>
  onSuccess?: () => void
}

type Step = 'select' | 'teams' | 'schedule' | 'options' | 'confirm' | 'success'

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const WEEKDAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

/**
 * Multi-step wizard for generating fixtures. Shows tournament selection,
 * team selection, schedule configuration, options, and confirmation before calling the API.
 */
export function FixtureWizard({ tournaments, getActiveTeams, onSuccess }: FixtureWizardProps) {
  const [step, setStep] = useState<Step>('select')
  const [selectedTournamentId, setSelectedTournamentId] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set())
  const [isDoubleRound, setIsDoubleRound] = useState(false)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const [scheduleErrors, setScheduleErrors] = useState<Record<string, string>>({})

  const [schedule, setSchedule] = useState<FixtureSchedule>({
    start_date: '',
    match_days: ['saturday'],
    start_time: '08:00',
    fields_available: 1,
    half_minutes: 20,
    halftime_break_minutes: 10,
    break_between_matches: 15,
  })

  const duplicates = useDuplicateMatches(selectedTournamentId)
  const existingMatches = useTournamentMatches(selectedTournamentId)
  const generateFixtures = useGenerateFixtures()

  const hasDuplicates = (duplicates.data?.length ?? 0) > 0
  const hasExistingMatches = (existingMatches.data?.data.length ?? 0) > 0

  const availableTeams = useMemo(() => getActiveTeams(selectedTournamentId), [selectedTournamentId, getActiveTeams])
  const filteredTeams = availableTeams.filter((t) => selectedTeams.has(t.id))

  // Auto-select active tournament teams on first visit to teams step
  const handleTournamentSelect = useCallback(
    (tournamentId: string) => {
      setSelectedTournamentId(tournamentId)
      // Auto-select all active teams for this tournament
      const teamIds = getActiveTeams(tournamentId)
      setSelectedTeams(new Set(teamIds.map((t) => t.id)))
      setScheduleErrors({})
    },
    [getActiveTeams],
  )

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

  const handleScheduleChange = useCallback(
    (field: keyof FixtureSchedule, value: string | number | undefined) => {
      setSchedule((prev) => ({ ...prev, [field]: value }))
      // Clear error for this field when user edits it
      if (scheduleErrors[field]) {
        const newErrors = { ...scheduleErrors }
        delete newErrors[field]
        setScheduleErrors(newErrors)
      }
    },
    [scheduleErrors],
  )

  const handleToggleWeekday = useCallback(
    (day: string) => {
      setSchedule((prev) => {
        const days = prev.match_days.includes(day)
          ? prev.match_days.filter((d) => d !== day)
          : [...prev.match_days, day]
        return { ...prev, match_days: days }
      })
    },
    [],
  )

  const handleGenerateClick = async () => {
    if (!selectedTournamentId) return

    if (hasDuplicates && !confirmOverwrite) {
      setStep('confirm')
      return
    }

    const req: GenerateFixturesRequest = {
      tournament_id: selectedTournamentId,
      teams: filteredTeams.map((t) => ({ id: t.id, name: t.name })),
      is_double_round: isDoubleRound,
      schedule,
    }

    try {
      await generateFixtures.mutateAsync(req)
      setStep('success')
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        // Map field errors to schedule errors
        const newErrors: Record<string, string> = {}
        for (const [field, message] of Object.entries(err.fields)) {
          newErrors[field] = message
        }
        setScheduleErrors(newErrors)
        if (Object.keys(newErrors).length > 0) {
          setStep('schedule')
        }
      }
    }
  }

  // Step 1: Tournament selection
  if (step === 'select') {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="tournament-select" className="text-base font-semibold">
            Selecciona el torneo
          </Label>
          <Select value={selectedTournamentId} onValueChange={handleTournamentSelect}>
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
      </div>
    )
  }

  // Step 2: Team selection
  if (step === 'teams') {
    return (
      <div className="space-y-6">
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
            Equipos ({selectedTeams.size}/{availableTeams.length})
          </Label>
          <ScrollArea className="border rounded-lg p-3 h-64">
            <div className="space-y-2 pr-4">
              {availableTeams.map((team) => (
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
          <Button variant="outline" onClick={() => setStep('select')}>
            Atrás
          </Button>
          <Button onClick={() => setStep('schedule')} disabled={selectedTeams.size < 2}>
            Siguiente
          </Button>
        </div>
      </div>
    )
  }

  // Step 3: Schedule configuration
  if (step === 'schedule') {
    const fieldError = scheduleErrors['schedule']
    const startDateError = scheduleErrors['schedule.start_date']

    return (
      <div className="space-y-6">
        {Object.keys(scheduleErrors).length > 0 && !fieldError && (
          <Alert className="border-destructive/30 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Revisa los errores en los campos para corregirlos.
            </AlertDescription>
          </Alert>
        )}

        {fieldError && (
          <Alert className="border-destructive/30 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">{fieldError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Label htmlFor="start-date" className="text-base font-semibold">
            Fecha de inicio
          </Label>
          <Input
            id="start-date"
            type="date"
            value={schedule.start_date}
            onChange={(e) => handleScheduleChange('start_date', e.target.value)}
            aria-invalid={!!startDateError}
            aria-describedby={startDateError ? 'start-date-error' : undefined}
          />
          {startDateError && (
            <p id="start-date-error" className="text-xs text-destructive">
              {startDateError}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="end-date" className="text-base font-semibold">
            Fecha de fin (opcional)
          </Label>
          <Input
            id="end-date"
            type="date"
            value={schedule.end_date ?? ''}
            onChange={(e) => handleScheduleChange('end_date', e.target.value || undefined)}
            aria-describedby={scheduleErrors['schedule.end_date'] ? 'end-date-error' : undefined}
          />
          {scheduleErrors['schedule.end_date'] && (
            <p id="end-date-error" className="text-xs text-destructive">
              {scheduleErrors['schedule.end_date']}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">Días de juego</Label>
          <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
            {WEEKDAYS.map((day) => (
              <div key={day} className="flex items-center gap-2">
                <Checkbox
                  id={`day-${day}`}
                  checked={schedule.match_days.includes(day)}
                  onCheckedChange={() => handleToggleWeekday(day)}
                />
                <Label htmlFor={`day-${day}`} className="font-normal cursor-pointer">
                  {WEEKDAY_LABELS[day]}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-3">
            <Label htmlFor="start-time" className="flex items-center gap-1 text-base font-semibold">
              <Clock className="h-4 w-4" />
              Hora de inicio
            </Label>
            <Input
              id="start-time"
              type="time"
              value={schedule.start_time}
              onChange={(e) => handleScheduleChange('start_time', e.target.value)}
              aria-describedby={scheduleErrors['schedule.start_time'] ? 'start-time-error' : undefined}
            />
            {scheduleErrors['schedule.start_time'] && (
              <p id="start-time-error" className="text-xs text-destructive">
                {scheduleErrors['schedule.start_time']}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="end-time" className="flex items-center gap-1 text-base font-semibold">
              <Clock className="h-4 w-4" />
              Hora de fin (opcional)
            </Label>
            <Input
              id="end-time"
              type="time"
              value={schedule.end_time ?? ''}
              onChange={(e) => handleScheduleChange('end_time', e.target.value || undefined)}
              aria-describedby={scheduleErrors['schedule.end_time'] ? 'end-time-error' : undefined}
            />
            {scheduleErrors['schedule.end_time'] && (
              <p id="end-time-error" className="text-xs text-destructive">
                {scheduleErrors['schedule.end_time']}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-3">
            <Label htmlFor="fields" className="text-base font-semibold">
              Canchas disponibles
            </Label>
            <Input
              id="fields"
              type="number"
              min="1"
              value={schedule.fields_available}
              onChange={(e) => handleScheduleChange('fields_available', parseInt(e.target.value) || 1)}
              aria-describedby={scheduleErrors['schedule.fields_available'] ? 'fields-error' : undefined}
            />
            {scheduleErrors['schedule.fields_available'] && (
              <p id="fields-error" className="text-xs text-destructive">
                {scheduleErrors['schedule.fields_available']}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="half-minutes" className="text-base font-semibold">
              Minutos por tiempo
            </Label>
            <Input
              id="half-minutes"
              type="number"
              min="1"
              value={schedule.half_minutes}
              onChange={(e) => handleScheduleChange('half_minutes', parseInt(e.target.value) || 20)}
              aria-describedby={scheduleErrors['schedule.half_minutes'] ? 'half-minutes-error' : undefined}
            />
            {scheduleErrors['schedule.half_minutes'] && (
              <p id="half-minutes-error" className="text-xs text-destructive">
                {scheduleErrors['schedule.half_minutes']}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-3">
            <Label htmlFor="halftime-break" className="text-base font-semibold">
              Descanso entretiempos
            </Label>
            <Input
              id="halftime-break"
              type="number"
              min="0"
              value={schedule.halftime_break_minutes}
              onChange={(e) => handleScheduleChange('halftime_break_minutes', parseInt(e.target.value) || 10)}
              aria-describedby={scheduleErrors['schedule.halftime_break_minutes'] ? 'halftime-break-error' : undefined}
            />
            {scheduleErrors['schedule.halftime_break_minutes'] && (
              <p id="halftime-break-error" className="text-xs text-destructive">
                {scheduleErrors['schedule.halftime_break_minutes']}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="break-between" className="text-base font-semibold">
              Descanso entre partidos
            </Label>
            <Input
              id="break-between"
              type="number"
              min="0"
              value={schedule.break_between_matches}
              onChange={(e) => handleScheduleChange('break_between_matches', parseInt(e.target.value) || 15)}
              aria-describedby={scheduleErrors['schedule.break_between_matches'] ? 'break-between-error' : undefined}
            />
            {scheduleErrors['schedule.break_between_matches'] && (
              <p id="break-between-error" className="text-xs text-destructive">
                {scheduleErrors['schedule.break_between_matches']}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep('teams')}>
            Atrás
          </Button>
          <Button onClick={() => setStep('options')}>
            Siguiente
          </Button>
        </div>
      </div>
    )
  }

  // Step 4: Options (double round, etc)
  if (step === 'options') {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-semibold">Opciones</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              id="double-round"
              checked={isDoubleRound}
              onCheckedChange={(checked) => setIsDoubleRound(Boolean(checked))}
            />
            <Label htmlFor="double-round" className="font-normal cursor-pointer">
              Ida y vuelta (doblete)
            </Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep('schedule')}>
            Atrás
          </Button>
          <Button onClick={() => setStep('confirm')}>
            Siguiente
          </Button>
        </div>
      </div>
    )
  }

  // Step 5: Confirmation
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

  if (step === 'confirm') {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
          <p className="text-sm font-medium">
            <strong>Torneo:</strong> {tournaments.find((t) => t.id === selectedTournamentId)?.name}
          </p>
          <p className="text-sm font-medium">
            <strong>Equipos:</strong> {filteredTeams.length}
          </p>
          <p className="text-sm font-medium">
            <strong>Jornadas:</strong> {filteredTeams.length > 1 ? filteredTeams.length - 1 : 0}
            {isDoubleRound ? ' × 2 (ida y vuelta)' : ''}
          </p>
          <p className="text-sm font-medium">
            <strong>Inicio:</strong> {schedule.start_date}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep('options')}>
            Atrás
          </Button>
          <Button
            onClick={handleGenerateClick}
            disabled={generateFixtures.isPending}
            className="flex-1"
          >
            {generateFixtures.isPending ? 'Generando…' : 'Generar Fixtures'}
          </Button>
        </div>
      </div>
    )
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-center">
          <p className="font-semibold text-success">¡Fixtures generados correctamente!</p>
          <p className="text-sm text-muted-foreground">
            Se generaron {selectedTeams.size > 1 ? selectedTeams.size - 1 : 0} jornadas con éxito.
          </p>
        </div>

        <Button onClick={() => onSuccess?.()} className="w-full">
          Listo
        </Button>
      </div>
    )
  }

  // Default: return to select step
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Inicio del asistente...</p>
      <Button onClick={() => setStep('select')}>Comenzar</Button>
    </div>
  )
}
