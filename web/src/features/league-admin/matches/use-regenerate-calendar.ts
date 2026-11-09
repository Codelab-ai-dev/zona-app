import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { runFixtureFollowUps } from '@/features/league-admin/fixtures/api'
import { ApiError } from '@/lib/api/client'

import { useBulkCreateMatches, useDeleteMatch, matchKeys } from './api'
import { analyzeRegeneration, buildMissingMatches } from './calendar-analysis'
import type { MatchWithRelations, TeamSummary } from './types'

/**
 * "Regenerar" of Ajustar Calendario: deletes the scheduled matches of the
 * regular phase and creates the pairings still to play in new rounds.
 * There is no "delete scheduled only" endpoint, so each match is deleted
 * with DELETE /matches/{id}; the new calendar is built before deleting
 * anything and is only created if every deletion succeeded.
 */
export function useRegenerateCalendar(
  leagueId: string | undefined,
  tournamentId: string,
  teams: TeamSummary[],
  matches: MatchWithRelations[],
  onDone: () => void,
) {
  const deleteMatch = useDeleteMatch()
  const bulkCreate = useBulkCreateMatches()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const plan = analyzeRegeneration(teams, matches)
  const newMatches = buildMissingMatches(plan.analysis, plan.kept)

  const regenerate = async () => {
    setPending(true)
    try {
      const results = await Promise.allSettled(plan.scheduled.map((m) => deleteMatch.mutateAsync(m.id)))
      const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
      if (failed) {
        void queryClient.invalidateQueries({ queryKey: matchKeys.all })
        const msg = failed.reason instanceof ApiError ? failed.reason.message : 'Error al eliminar'
        toast.error(`${msg}. No se creó el calendario nuevo; revisa los partidos y vuelve a intentarlo.`)
        return
      }
      const created = newMatches.length > 0 ? await bulkCreate.mutateAsync({ tournamentId, matches: newMatches }) : []
      const rounds = [...new Set(newMatches.map((m) => m.round ?? 0))].filter((r) => r > 0).sort((a, b) => a - b)
      const first = rounds[0]
      toast.success(
        `Calendario ajustado exitosamente. ${created.length} partidos programados con ${plan.analysis.activeTeams.length} equipos activos.` +
          (plan.analysis.lastRound > 0 && first ? ` Las jornadas 1-${plan.analysis.lastRound} se mantuvieron. Nuevas jornadas desde la ${first}.` : ''),
      )
      onDone()
      if (leagueId) {
        const ok = (await Promise.all(rounds.map((r) => runFixtureFollowUps(leagueId, tournamentId, r)))).every(Boolean)
        if (!ok) toast.warning('El calendario se regeneró, pero no se pudo notificar por WhatsApp o actualizar la base de conocimiento')
      }
    } catch (err) {
      toast.error(
        `${err instanceof ApiError ? err.message : 'Error al crear el calendario'}. Los partidos programados ya se eliminaron: usa "Crear partidos faltantes" para volver a generarlos.`,
      )
      void queryClient.invalidateQueries({ queryKey: matchKeys.all })
    } finally {
      setPending(false)
    }
  }

  return { plan, newMatches, pending, regenerate }
}
