import { toast } from 'sonner'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import type { AgeRules } from '../age-rules'
import { useUpdatePlayer, useUploadFile } from '../api'
import { PLAYER_POSITIONS } from '../constants'
import type { CreatePlayerRequest, Player } from '../types'
import { PlayerForm } from './player-form'

interface PlayerEditDialogProps {
  player: Player
  ageRules: AgeRules | null
  usedExceptions: number
  onClose: () => void
}

/** Edit dialog: PlayerForm prefilled, PATCH /players/{id} (a replaced photo is uploaded first). */
export function PlayerEditDialog({ player, ageRules, usedExceptions, onClose }: PlayerEditDialogProps) {
  const updatePlayer = useUpdatePlayer()
  const uploadFile = useUploadFile()

  // Errors propagate to the form, which maps 422 fields onto its inputs.
  const handleSubmit = async (data: CreatePlayerRequest, photo?: File) => {
    let photoUrl: string | undefined
    if (photo) {
      const uploaded = await uploadFile.mutateAsync({ file: photo, scope: 'player', scopeId: player.id })
      photoUrl = uploaded.url
    }
    await updatePlayer.mutateAsync({ playerId: player.id, data: { ...data, ...(photoUrl ? { photo: photoUrl } : {}) } })
    toast.success('Jugador actualizado')
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Jugador</DialogTitle>
          <DialogDescription className="text-slate-400">Actualiza la información de {player.name}</DialogDescription>
        </DialogHeader>
        <PlayerForm
          positions={PLAYER_POSITIONS}
          player={player}
          ageRules={ageRules}
          usedExceptions={usedExceptions}
          onSubmit={handleSubmit}
          isLoading={updatePlayer.isPending || uploadFile.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
