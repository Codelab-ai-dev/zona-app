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
import { Plus, Trash2 } from 'lucide-react'

import { useTeamPlayers, useCreatePlayer, useDeactivatePlayer } from '../api'
import type { CreatePlayerRequest } from '../types'
import { PlayerForm } from '../components/player-form'
import { PlayerRow } from '../components/player-row'

const positions = [
  'Portero',
  'Defensa Central',
  'Lateral Derecho',
  'Lateral Izquierdo',
  'Mediocampista Defensivo',
  'Mediocampista Central',
  'Mediocampista Ofensivo',
  'Extremo Derecho',
  'Extremo Izquierdo',
  'Delantero',
]

export function PlayerManagementPage({ teamId }: { teamId: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null)

  const players = useTeamPlayers(teamId)
  const createPlayer = useCreatePlayer()
  const deactivatePlayer = useDeactivatePlayer()

  const handleCreatePlayer = async (data: CreatePlayerRequest) => {
    try {
      await createPlayer.mutateAsync({ teamId, data })
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to create player:', error)
    }
  }

  const handleDeactivatePlayer = async () => {
    if (!deletePlayerId) return
    try {
      await deactivatePlayer.mutateAsync(deletePlayerId)
      setDeletePlayerId(null)
    } catch (error) {
      console.error('Failed to deactivate player:', error)
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
            <PlayerForm positions={positions} onSubmit={handleCreatePlayer} isLoading={createPlayer.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <QueryState
        query={players}
        isEmpty={(res) => res.data.length === 0}
        empty={<EmptyState title="Sin jugadores" description="Agrega jugadores a tu equipo." action={<Button>Agregar Jugador</Button>} />}
      >
        {(res) => (
          <div className="space-y-4">
            {res.data.map((player) => (
              <div key={player.id} className="flex items-center justify-between rounded-lg border p-4">
                <PlayerRow player={player} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletePlayerId(player.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
            <AlertDialogAction onClick={handleDeactivatePlayer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
