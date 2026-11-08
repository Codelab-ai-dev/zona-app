import { useState } from 'react'
import { QueryState } from '@/components/states'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, User } from 'lucide-react'
import { toast } from 'sonner'

import { useTeam, useTeamPlayers, useTeamSuspensions, useCreatePlayer, useDeactivatePlayer, useUpdatePlayer, useUploadFile } from '../api'
import type { CreatePlayerRequest, Player } from '../types'
import { PLAYER_POSITIONS } from '../constants'
import { PlayerCredential } from '../components/player-credential'
import { PlayerForm } from '../components/player-form'
import { PlayerCard } from '../components/player-card'
import { pageSubtitle, pageTitle } from '../glass'

export function PlayerManagementPage({ teamId }: { teamId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null)
  const [credentialPlayer, setCredentialPlayer] = useState<Player | null>(null)

  const team = useTeam(teamId)
  const players = useTeamPlayers(teamId)
  const suspensions = useTeamSuspensions(teamId)
  const createPlayer = useCreatePlayer()
  const updatePlayer = useUpdatePlayer()
  const uploadFile = useUploadFile()
  const deactivatePlayer = useDeactivatePlayer()

  // Errors propagate to the form, which maps 422 fields onto its inputs.
  const handleCreatePlayer = async (data: CreatePlayerRequest, photo?: File) => {
    const created = await createPlayer.mutateAsync({ teamId, data })
    setIsDialogOpen(false)
    if (!photo) return
    // The photo is scoped to the player id, so it can only be uploaded after creation.
    try {
      const uploaded = await uploadFile.mutateAsync({ file: photo, scope: 'player', scopeId: created.id })
      if (uploaded.url) await updatePlayer.mutateAsync({ playerId: created.id, data: { photo: uploaded.url } })
    } catch {
      toast.warning('El jugador se agregó, pero no se pudo guardar su foto')
    }
  }

  const suspended = new Set(
    (suspensions.data?.data ?? []).filter((x) => x.status === 'active' || x.matches_served < x.matches_to_serve).map((x) => x.player_id),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className={pageTitle}>Gestión de Jugadores</h2>
          <p className={pageSubtitle}>Administra los jugadores de tu equipo</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Nuevo Jugador
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Registrar Nuevo Jugador</DialogTitle>
              <DialogDescription className="text-slate-400">Completa la información del jugador</DialogDescription>
            </DialogHeader>
            <PlayerForm
              positions={PLAYER_POSITIONS}
              onSubmit={handleCreatePlayer}
              isLoading={createPlayer.isPending || uploadFile.isPending || updatePlayer.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <QueryState
        query={players}
        isEmpty={(res) => res.data.length === 0}
        empty={
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-base sm:text-lg font-medium text-white mb-2">Sin jugadores</h3>
            <p className="text-white/70">Comienza registrando jugadores para tu equipo</p>
          </div>
        }
      >
        {(res) => (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {res.data.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                suspended={suspended.has(player.id)}
                onCredential={() => setCredentialPlayer(player)}
                onDeactivate={() => setDeletePlayerId(player.id)}
              />
            ))}
          </div>
        )}
      </QueryState>

      <AlertDialog open={Boolean(deletePlayerId)} onOpenChange={(open) => !open && setDeletePlayerId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Desactivar Jugador</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">¿Estás seguro de que quieres desactivar este jugador? Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePlayerId && deactivatePlayer.mutate(deletePlayerId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {credentialPlayer && team.data && (
        <PlayerCredential
          open
          onOpenChange={(open) => !open && setCredentialPlayer(null)}
          player={credentialPlayer}
          teamName={team.data.name}
          teamLogo={team.data.logo}
          leagueId={team.data.league_id}
        />
      )}
    </div>
  )
}
