"use client"

import { useMemo } from 'react'
import { useTournamentById, usePlayersByTeam } from '@/lib/queries'
import {
  type AgeValidationRules,
  type AgeValidationResult,
  validatePlayerAge,
  describeAgeRules,
} from '@/lib/utils/age-utils'

interface UseAgeValidationOptions {
  tournamentId?: string
  teamId?: string
}

export function useAgeValidation({ tournamentId, teamId }: UseAgeValidationOptions) {
  const { data: tournament, isLoading: loadingTournament } = useTournamentById(tournamentId)
  const { data: players = [], isLoading: loadingPlayers } = usePlayersByTeam(teamId)

  const rules: AgeValidationRules | null = useMemo(() => {
    if (!tournament) return null

    return {
      age_validation_enabled: tournament.age_validation_enabled ?? false,
      min_age: tournament.min_age ?? null,
      max_age: tournament.max_age ?? null,
      age_reference_date: tournament.age_reference_date ?? null,
      age_exception_count: tournament.age_exception_count ?? 0,
      age_exception_min_age: tournament.age_exception_min_age ?? null,
      age_exception_max_age: tournament.age_exception_max_age ?? null,
    }
  }, [tournament])

  // Count how many exceptions are already used by existing players
  const usedExceptions = useMemo(() => {
    if (!rules || !rules.age_validation_enabled || !players.length) return 0

    let count = 0
    for (const player of players) {
      if (!player.birth_date) continue

      const result = validatePlayerAge(player.birth_date, rules, 0)
      if (result.isException) {
        count++
      }
    }
    return count
  }, [rules, players])

  const availableExceptions = useMemo(() => {
    if (!rules) return 0
    return Math.max(0, rules.age_exception_count - usedExceptions)
  }, [rules, usedExceptions])

  const validateAge = useMemo(() => {
    return (birthDate: string): AgeValidationResult => {
      if (!rules) {
        return {
          isValid: true,
          age: 0,
          meetsRegularRequirements: true,
          isException: false,
        }
      }
      return validatePlayerAge(birthDate, rules, usedExceptions)
    }
  }, [rules, usedExceptions])

  const rulesDescription = useMemo(() => {
    if (!rules) return 'Sin restricción de edad'
    return describeAgeRules(rules)
  }, [rules])

  const isAgeValidationEnabled = rules?.age_validation_enabled ?? false
  const isIdDocumentRequired = tournament?.id_document_required ?? false

  return {
    rules,
    isLoading: loadingTournament || loadingPlayers,
    isAgeValidationEnabled,
    isIdDocumentRequired,
    usedExceptions,
    availableExceptions,
    validateAge,
    rulesDescription,
  }
}
