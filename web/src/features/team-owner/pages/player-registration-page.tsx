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

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
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
      <Badge variant="outline" className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {statusLabels[status] || status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Solicitudes de Registro de Jugadores</h2>
          <p className="text-muted-foreground">Gestiona las solicitudes de registro de nuevos jugadores.</p>
        </div>
        {tournamentId && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Solicitud
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Solicitud de Registro</DialogTitle>
                <DialogDescription>Ingresa los detalles del nuevo jugador para registrarlo.</DialogDescription>
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">No hay torneo seleccionado</p>
            <p className="text-sm text-amber-800">Selecciona un torneo para crear nuevas solicitudes de registro.</p>
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
              <div key={request.id} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{request.player_name}</h3>
                    <p className="text-sm text-muted-foreground">{request.player_position}</p>

                    <div className="mt-3 space-y-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Número de camiseta:</span> #{request.jersey_number}
                      </div>
                      {request.birth_date && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Fecha de nacimiento:</span>{' '}
                          {formatDate(request.birth_date)}
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="text-muted-foreground">Motivo:</span> {request.reason}
                      </div>
                      {request.review_notes && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Notas de revisión:</span> {request.review_notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    {getStatusBadge(request.status)}
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
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
