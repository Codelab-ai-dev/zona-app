import { useState } from 'react'
import { toast } from 'sonner'

import { runFixtureFollowUps } from '@/features/league-admin/fixtures/api'
import { ApiError } from '@/lib/api/client'

import { useDeleteTournamentMatches, usePublishRound } from './api'

/** Publish/unpublish and delete for whole rounds of a tournament. */
export function useRoundActions(leagueId: string, tournamentId: string) {
  const publishRound = usePublishRound()
  const deleteMatches = useDeleteTournamentMatches()
  const [deletingRound, setDeletingRound] = useState<number | null>(null)

  const togglePublish = async (round: number, publish: boolean) => {
    if (!tournamentId) return
    try {
      await publishRound.mutateAsync({ tournamentId, round, isPublished: publish })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Error al ${publish ? 'publicar' : 'despublicar'} la jornada`)
      return
    }
    if (!publish) {
      toast.success(`Jornada ${round} despublicada. Ya no es visible públicamente.`)
      return
    }
    toast.success(`Jornada ${round} publicada exitosamente`)
    // Same follow-ups as after generating fixtures; they never undo the publish.
    const ok = await runFixtureFollowUps(leagueId, tournamentId, round)
    if (!ok) toast.warning('La jornada se publicó, pero no se pudo notificar por WhatsApp o actualizar la base de conocimiento')
  }

  const confirmDeleteRound = async () => {
    if (deletingRound === null) return
    try {
      const res = await deleteMatches.mutateAsync({ tournamentId, round: deletingRound })
      toast.success(`Jornada ${deletingRound} eliminada (${res.deleted} partidos)`)
      setDeletingRound(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al eliminar la jornada')
    }
  }

  return {
    publishing: publishRound.isPending,
    togglePublish,
    deletingRound,
    setDeletingRound,
    deletePending: deleteMatches.isPending,
    confirmDeleteRound,
  }
}
