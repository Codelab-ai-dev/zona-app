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
import { AlertCircle, Plus, Calendar } from 'lucide-react'

import { usePlayerRegistrationRequests, useCreatePlayerRegistrationRequest } from '../api'
import type { CreatePlayerRegistrationRequestRequest } from '../types'
import { PlayerRegistrationForm } from '../components/player-registration-form'
import { PLAYER_POSITIONS } from '../constants'
import { formatDate } from '../utils'
import { Badge } from '@/components/ui/badge'
import { pageSubtitle, pageTitle } from '../glass'

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-300/50',
  approved: 'bg-green-500/20 text-green-300 border-green-300/50',
  rejected: 'bg-red-500/20 text-red-300 border-red-300/50',
}

export function PlayerRegistrationPage({
  teamId,
  tournamentId,
}: {
  teamId: string
  tournamentId?: string
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const requests = usePlayerRegistrationRequests(teamId)
  const createRequest = useCreatePlayerRegistrationRequest()

  const handleCreateRequest = async (data: CreatePlayerRegistrationRequestRequest) => {
    if (!tournamentId) return
    // Errors propagate to the form, which maps 422 fields onto its inputs.
    await createRequest.mutateAsync({ teamId, tournamentId, data })
    setIsDialogOpen(false)
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={statusColors[status] || 'bg-gray-500/20 text-gray-300 border-gray-300/50'}>
        {statusLabels[status] || status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className={pageTitle}>Solicitudes de Registro de Jugadores</h2>
          <p className={pageSubtitle}>Gestiona las solicitudes de registro de nuevos jugadores.</p>
        </div>
        {tournamentId && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Nueva Solicitud
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Nueva Solicitud de Registro</DialogTitle>
                <DialogDescription className="text-slate-400">Ingresa los detalles del nuevo jugador para registrarlo.</DialogDescription>
              </DialogHeader>
              <PlayerRegistrationForm
                positions={PLAYER_POSITIONS}
                onSubmit={handleCreateRequest}
                isLoading={createRequest.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!tournamentId && (
        <div className="rounded-xl border border-amber-300/30 backdrop-blur-md bg-amber-500/20 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-white">No hay torneo seleccionado</p>
            <p className="text-sm text-white/80">Selecciona un torneo para crear nuevas solicitudes de registro.</p>
          </div>
        </div>
      )}

      <QueryState
        query={requests}
        isEmpty={(res) => res.data.length === 0}
        empty={
          <EmptyState
            title="Sin solicitudes"
            description="No hay solicitudes de registro de jugadores."
          />
        }
      >
        {(res) => (
          <div className="space-y-4">
            {res.data.map((request) => (
              <div key={request.id} className="rounded-xl border p-4 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl hover:bg-white/15 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-white drop-shadow">{request.player_name}</h3>
                    <p className="text-sm text-white/70">{request.player_position}</p>

                    <div className="mt-3 space-y-2">
                      <div className="text-sm text-white/90">
                        <span className="text-white/70">Número de camiseta:</span> #{request.jersey_number}
                      </div>
                      {request.birth_date && (
                        <div className="text-sm text-white/90">
                          <span className="text-white/70">Fecha de nacimiento:</span>{' '}
                          {formatDate(request.birth_date)}
                        </div>
                      )}
                      <div className="text-sm text-white/90">
                        <span className="text-white/70">Motivo:</span> {request.reason}
                      </div>
                      {request.review_notes && (
                        <div className="text-sm text-white/90">
                          <span className="text-white/70">Notas de revisión:</span> {request.review_notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    {getStatusBadge(request.status)}
                    <div className="text-xs text-white/70 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(request.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  )
}
