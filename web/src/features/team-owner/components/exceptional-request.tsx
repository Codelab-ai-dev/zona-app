import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

import { useCreatePlayerRegistrationRequest } from '../api'
import { PLAYER_POSITIONS } from '../constants'
import type { CreatePlayerRegistrationRequestRequest } from '../types'
import { PlayerRegistrationForm } from './player-registration-form'

interface ExceptionalRequestProps {
  teamId: string
  tournamentId: string
}

/** "Solicitar Jugador Excepcional": the way to register a player once the league closed registration. */
export function ExceptionalRequest({ teamId, tournamentId }: ExceptionalRequestProps) {
  const [open, setOpen] = useState(false)
  const createRequest = useCreatePlayerRegistrationRequest()

  // Errors propagate to the form, which maps 422 fields onto its inputs.
  const handleSubmit = async (data: CreatePlayerRegistrationRequestRequest) => {
    await createRequest.mutateAsync({ teamId, tournamentId, data })
    setOpen(false)
  }

  return (
    <div className="border-t-2 border-white/20 pt-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white drop-shadow-lg">Solicitar Jugador Excepcional</h3>
          <p className="text-sm text-white/80 drop-shadow">Por lesión u otra circunstancia excepcional</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="backdrop-blur-md bg-blue-500/20 border-blue-300/50 text-white hover:bg-blue-500/30">
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Solicitar Jugador
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Solicitar Registro Excepcional</DialogTitle>
              <DialogDescription className="text-slate-400">
                Completa la información del jugador y justifica la solicitud. El administrador de la liga revisará tu solicitud.
              </DialogDescription>
            </DialogHeader>
            <PlayerRegistrationForm positions={PLAYER_POSITIONS} onSubmit={handleSubmit} isLoading={createRequest.isPending} exceptional />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
