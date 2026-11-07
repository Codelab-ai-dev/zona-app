import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api/client'
import type { Tournament } from '@/features/leagues/types'

import { useDuplicateMatches, useGenerateFixtures, useTournamentMatches, runFixtureFollowUps } from './api'
import { ConfirmStep } from './components/steps/confirm-step'
import { DuplicatesStep } from './components/steps/duplicates-step'
import { OptionsStep } from './components/steps/options-step'
import { ScheduleStep } from './components/steps/schedule-step'
import { SelectStep } from './components/steps/select-step'
import { SuccessStep } from './components/steps/success-step'
import { TeamsStep } from './components/steps/teams-step'
import type { FixtureSchedule, GenerateFixturesRequest, GenerateFixturesResponse } from './types'

interface FixtureWizardProps {
  tournaments: Tournament[]
  getActiveTeams: (tournamentId?: string) => Array<{ id: string; name: string; is_active: boolean }>
  onSuccess?: () => void
}

type Step = 'select' | 'teams' | 'schedule' | 'options' | 'confirm' | 'duplicates' | 'success'

const DEFAULT_SCHEDULE: FixtureSchedule = {
  start_date: '',
  match_days: ['saturday'],
  start_time: '08:00',
  fields_available: 1,
  half_minutes: 20,
  halftime_break_minutes: 10,
  break_between_matches: 15,
}

/**
 * Multi-step wizard for generating fixtures: tournament, teams, schedule,
 * options and confirmation. The server runs the round-robin algorithm.
 */
export function FixtureWizard({ tournaments, getActiveTeams, onSuccess }: FixtureWizardProps) {
  const [step, setStep] = useState<Step>('select')
  const [tournamentId, setTournamentId] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set())
  const [isDoubleRound, setIsDoubleRound] = useState(false)
  const [scheduleErrors, setScheduleErrors] = useState<Record<string, string>>({})
  const [schedule, setSchedule] = useState<FixtureSchedule>(DEFAULT_SCHEDULE)
  const [result, setResult] = useState<GenerateFixturesResponse | null>(null)

  const duplicates = useDuplicateMatches(tournamentId)
  const existingMatches = useTournamentMatches(tournamentId)
  const generateFixtures = useGenerateFixtures()

  const duplicateCount = duplicates.data?.length ?? 0
  const availableTeams = useMemo(() => getActiveTeams(tournamentId), [tournamentId, getActiveTeams])
  const chosenTeams = availableTeams.filter((t) => selectedTeams.has(t.id))

  const handleTournamentSelect = (id: string) => {
    setTournamentId(id)
    setSelectedTeams(new Set(getActiveTeams(id).map((t) => t.id)))
    setScheduleErrors({})
    setStep('teams')
  }

  const handleToggleTeam = (teamId: string, checked: boolean) => {
    setSelectedTeams((prev) => {
      const next = new Set(prev)
      if (checked) next.add(teamId)
      else next.delete(teamId)
      return next
    })
  }

  const handleScheduleChange = useCallback((field: keyof FixtureSchedule, value: string | number | undefined) => {
    setSchedule((prev) => ({ ...prev, [field]: value }))
    setScheduleErrors((prev) => {
      const key = `schedule.${field}`
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const handleToggleDay = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      match_days: prev.match_days.includes(day) ? prev.match_days.filter((d) => d !== day) : [...prev.match_days, day],
    }))
  }

  const generate = async () => {
    if (!tournamentId) return
    const req: GenerateFixturesRequest = {
      tournament_id: tournamentId,
      teams: chosenTeams.map((t) => ({ id: t.id, name: t.name })),
      is_double_round: isDoubleRound,
      schedule,
    }
    try {
      const res = await generateFixtures.mutateAsync(req)
      setResult(res)
      setStep('success')
      const leagueId = tournaments.find((t) => t.id === tournamentId)?.league_id
      if (leagueId) {
        // Optional follow-ups must never undo the success view.
        const ok = await runFixtureFollowUps(leagueId, tournamentId, 1)
        if (!ok) toast.warning('Los fixtures se generaron, pero no se pudo notificar o actualizar la base de conocimiento')
      }
    } catch (err) {
      if (err instanceof ApiError && err.isValidation && Object.keys(err.fields).length > 0) {
        setScheduleErrors(err.fields)
        setStep('schedule')
      }
    }
  }

  const onGenerateClick = () => {
    if (duplicateCount > 0) setStep('duplicates')
    else void generate()
  }

  switch (step) {
    case 'select':
      return <SelectStep tournaments={tournaments} value={tournamentId} onSelect={handleTournamentSelect} />
    case 'teams':
      return (
        <TeamsStep
          teams={availableTeams}
          selected={selectedTeams}
          existingMatches={existingMatches.data?.data.length ?? 0}
          onToggle={handleToggleTeam}
          onBack={() => setStep('select')}
          onNext={() => setStep('schedule')}
        />
      )
    case 'schedule':
      return (
        <ScheduleStep
          schedule={schedule}
          errors={scheduleErrors}
          onChange={handleScheduleChange}
          onToggleDay={handleToggleDay}
          onBack={() => setStep('teams')}
          onNext={() => setStep('options')}
        />
      )
    case 'options':
      return (
        <OptionsStep
          isDoubleRound={isDoubleRound}
          onDoubleRoundChange={setIsDoubleRound}
          onBack={() => setStep('schedule')}
          onNext={() => setStep('confirm')}
        />
      )
    case 'duplicates':
      return (
        <DuplicatesStep
          count={duplicateCount}
          pending={generateFixtures.isPending}
          onCancel={() => setStep('confirm')}
          onConfirm={() => void generate()}
        />
      )
    case 'confirm':
      return (
        <ConfirmStep
          tournamentName={tournaments.find((t) => t.id === tournamentId)?.name ?? ''}
          teamCount={chosenTeams.length}
          isDoubleRound={isDoubleRound}
          startDate={schedule.start_date}
          pending={generateFixtures.isPending}
          onBack={() => setStep('options')}
          onGenerate={onGenerateClick}
        />
      )
    case 'success':
      return (
        <SuccessStep
          rounds={result?.rounds ?? 0}
          matches={result?.matches.length ?? 0}
          onDone={() => onSuccess?.()}
        />
      )
  }
}
