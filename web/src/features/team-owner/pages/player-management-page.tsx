import { useState } from 'react'
import { QueryState, EmptyState } from '@/components/states'
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
import { IdCard, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useTeam, useTeamPlayers, useCreatePlayer, useDeactivatePlayer, useUpdatePlayer, useUploadFile } from '../api'
import type { CreatePlayerRequest, Player } from '../types'
import { PLAYER_POSITIONS } from '../constants'
import { PlayerCredential } from '../components/player-credential'
import { PlayerForm } from '../components/player-form'
import { PlayerRow } from '../components/player-row'

export function PlayerManagementPage({ teamId }: { teamId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null)
  const [credentialPlayer, setCredentialPlayer] = useState<Player | null>(null)

  const team = useTeam(teamId)
  const players = useTeamPlayers(teamId)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Jugadores</h2>
          <p className="text-muted-foreground">Agrega y edita los jugadores de tu equipo.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Jugador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Jugador</DialogTitle>
              <DialogDescription>Ingresa los detalles del nuevo jugador.</DialogDescription>
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
        empty={<EmptyState title="Sin jugadores" description="Agrega jugadores a tu equipo." />}
      >
        {(res) => (
          <div className="space-y-4">
            {res.data.map((player) => (
              <div key={player.id} className="flex items-center justify-between rounded-lg border p-4">
                <PlayerRow player={player} />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCredentialPlayer(player)}
                    aria-label={`Credencial de ${player.name}`}
                  >
                    <IdCard className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletePlayerId(player.id)}
                    aria-label={`Desactivar a ${player.name}`}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>

      <AlertDialog open={Boolean(deletePlayerId)} onOpenChange={(open) => !open && setDeletePlayerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar Jugador</AlertDialogTitle>
            <AlertDialogDescription>¿Estás seguro de que quieres desactivar este jugador? Esta acción no se puede deshacer.</AlertDialogDescription>
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
