import { useState } from 'react'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import type { PlayerRegistrationRequest } from '../types'

interface Props {
  request: PlayerRegistrationRequest
  teamName: string
  pending: boolean
  onReview: (status: 'approved' | 'rejected', notes: string | undefined) => void
  onClose: () => void
}

const info = 'text-sm font-semibold text-white'

/** Review dialog of the original app: approve and register the player, or reject with a required reason. */
export function ReviewRequestDialog({ request, teamName, pending, onReview, onClose }: Props) {
  const [notes, setNotes] = useState('')

  const reject = () => {
    if (!notes.trim()) {
      toast.error('Por favor proporciona una razón para el rechazo')
      return
    }
    onReview('rejected', notes)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-w-2xl border-white/10 bg-slate-900 text-white">
        <DialogHeader>
          <DialogTitle>Revisar Solicitud de Jugador</DialogTitle>
          <DialogDescription className="text-gray-400">Revisa la información y decide si aprobar o rechazar la solicitud</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-800/50 p-4">
            <div>
              <p className={info}>Jugador:</p>
              <p className="text-sm text-gray-300">{request.player_name}</p>
            </div>
            <div>
              <p className={info}>Posición:</p>
              <p className="text-sm text-gray-300">{request.player_position}</p>
            </div>
            <div>
              <p className={info}>Número:</p>
              <p className="text-sm text-gray-300">#{request.jersey_number}</p>
            </div>
            <div>
              <p className={info}>Equipo:</p>
              <p className="text-sm text-gray-300">{teamName}</p>
            </div>
          </div>
          <div>
            <p className="text-base font-medium">Justificación del Equipo:</p>
            <p className="mt-1 rounded bg-slate-800/50 p-3 text-sm text-gray-300">{request.reason}</p>
          </div>
          <div>
            <Label htmlFor="review-notes">Notas de Revisión (opcional para aprobación, requerida para rechazo)</Label>
            <Textarea
              id="review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agrega comentarios sobre tu decisión..."
              rows={3}
              className="mt-1 border-white/10 bg-slate-800/50 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button onClick={() => onReview('approved', notes.trim() ? notes : undefined)} disabled={pending} className="flex-1 bg-green-600 text-white hover:bg-green-700">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />}
              {pending ? 'Procesando...' : 'Aprobar y Registrar Jugador'}
            </Button>
            <Button onClick={reject} disabled={pending} variant="destructive" className="flex-1">
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />}
              {pending ? 'Procesando...' : 'Rechazar Solicitud'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
