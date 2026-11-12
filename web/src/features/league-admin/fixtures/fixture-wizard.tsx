import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api/client'
import type { Tournament } from '@/features/leagues/types'

import { useDuplicateMatches, useGenerateFixtures, useTournamentMatches, runFixtureFollowUps } from './api'
import { lettersFor } from '../teams/groups-logic'
import { ConfirmStep } from './components/steps/confirm-step'
import { DuplicatesStep } from './components/steps/duplicates-step'
import { GroupsStep } from './components/steps/groups-step'
import { PreviewStep } from './components/steps/preview-step'
import { OptionsStep } from './components/steps/options-step'
import { ScheduleStep } from './components/steps/schedule-step'
import { SelectStep } from './components/steps/select-step'
import { SuccessStep } from './components/steps/success-step'
import { TeamsStep } from './components/steps/teams-step'
import type { FixtureGroup, FixtureSchedule, GenerateFixturesRequest, GenerateFixturesResponse } from './types'

interface FixtureWizardProps {
  tournaments: Tournament[]
  getActiveTeams: (tournamentId?: string) => Array<{ id: string; name: string; is_active: boolean; group_name?: string }>
  onSuccess?: () => void
}

type Step = 'select' | 'teams' | 'schedule' | 'options' | 'groups' | 'confirm' | 'preview' | 'duplicates' | 'success'

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
  const [preview, setPreview] = useState<GenerateFixturesResponse | null>(null)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())

  const duplicates = useDuplicateMatches(tournamentId)
  const existingMatches = useTournamentMatches(tournamentId)
  const generateFixtures = useGenerateFixtures()

  const duplicateCount = duplicates.data?.length ?? 0
  const availableTeams = useMemo(() => getActiveTeams(tournamentId), [tournamentId, getActiveTeams])
  const chosenTeams = availableTeams.filter((t) => selectedTeams.has(t.id))
  const tournament = tournaments.find((t) => t.id === tournamentId)
  // Group stage: the calendar is built per group, from each team's group letter.
  const isGroupStage = tournament?.tournament_format === 'group_knockout'
  const letters = lettersFor(tournament?.number_of_groups ?? 1)
  const groupList: FixtureGroup[] = letters.map((name) => ({
    name,
    teams: availableTeams.filter((t) => t.group_name === name).map((t) => ({ id: t.id, name: t.name })),
  }))
  const unassigned = availableTeams.filter((t) => !t.group_name || !letters.includes(t.group_name))
  const chosenGroups = groupList.filter((g) => selectedGroups.has(g.name))
  const teamNames = new Map(availableTeams.map((t) => [t.id, t.name]))

  const handleTournamentSelect = (id: string) => {
    setTournamentId(id)
    const t = tournaments.find((x) => x.id === id)
    const groupStage = t?.tournament_format === 'group_knockout'
    const teams = getActiveTeams(id)
    setSelectedTeams(new Set(teams.map((x) => x.id)))
    // Every group with at least 2 teams starts selected.
    const names = lettersFor(t?.number_of_groups ?? 1)
    setSelectedGroups(new Set(names.filter((n) => teams.filter((x) => x.group_name === n).length >= 2)))
    setScheduleErrors({})
    setPreview(null)
    setStep(groupStage ? 'groups' : 'teams')
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

  const request = (dryRun: boolean): GenerateFixturesRequest => ({
    tournament_id: tournamentId,
    ...(isGroupStage ? { groups: chosenGroups } : { teams: chosenTeams.map((t) => ({ id: t.id, name: t.name })) }),
    is_double_round: isDoubleRound,
    schedule,
    ...(dryRun ? { dry_run: true } : {}),
  })

  const onApiError = (err: unknown) => {
    if (err instanceof ApiError && err.isValidation && Object.keys(err.fields).length > 0) {
      setScheduleErrors(err.fields)
      setStep('schedule')
    }
  }

  /** Step "Vista Previa": generate with dry_run, nothing is saved. */
  const generatePreview = async () => {
    if (!tournamentId) return
    try {
      setPreview(await generateFixtures.mutateAsync(request(true)))
      setStep('preview')
    } catch (err) {
      onApiError(err)
    }
  }

  /** "Guardar Calendario": the same request without dry_run. */
  const generate = async () => {
    if (!tournamentId) return
    try {
      const res = await generateFixtures.mutateAsync(request(false))
      setResult(res)
      setStep('success')
      const leagueId = tournament?.league_id
      if (leagueId) {
        // Optional follow-ups must never undo the success view.
        const ok = await runFixtureFollowUps(leagueId, tournamentId, 1)
        if (!ok) toast.warning('Los fixtures se generaron, pero no se pudo notificar o actualizar la base de conocimiento')
      }
    } catch (err) {
      onApiError(err)
    }
  }

  const onSaveClick = () => {
    if (duplicateCount > 0) setStep('duplicates')
    else void generate()
  }

  switch (step) {
    case 'select':
      return <SelectStep tournaments={tournaments} value={tournamentId} onSelect={handleTournamentSelect} />
    case 'groups':
      return (
        <GroupsStep
          groups={groupList}
          unassigned={unassigned}
          selected={selectedGroups}
          onToggle={(g, checked) =>
            setSelectedGroups((prev) => {
              const next = new Set(prev)
              if (checked) next.add(g)
              else next.delete(g)
              return next
            })
          }
          onBack={() => setStep('select')}
          onNext={() => setStep('schedule')}
        />
      )
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
          onSetDays={(days) => setSchedule((prev) => ({ ...prev, match_days: days }))}
          onBack={() => setStep(isGroupStage ? 'groups' : 'teams')}
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
          onCancel={() => setStep('preview')}
          onConfirm={() => void generate()}
        />
      )
    case 'confirm':
      return (
        <ConfirmStep
          tournamentName={tournament?.name ?? ''}
          teamCount={isGroupStage ? chosenGroups.reduce((n, g) => n + g.teams.length, 0) : chosenTeams.length}
          isDoubleRound={isDoubleRound}
          startDate={schedule.start_date}
          schedule={schedule}
          pending={generateFixtures.isPending}
          onBack={() => setStep('options')}
          onGenerate={() => void generatePreview()}
        />
      )
    case 'preview':
      return (
        <PreviewStep
          matches={preview?.matches ?? []}
          rounds={preview?.rounds ?? 0}
          teamNames={teamNames}
          pending={generateFixtures.isPending}
          onBack={() => setStep('confirm')}
          onSave={onSaveClick}
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
