import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import type { PlayerRegistrationRequest } from '../types'

interface RequestsTableProps {
  requests: PlayerRegistrationRequest[]
  isPending?: boolean
  onReview?: (requestId: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>
}

export function RequestsTable({ requests, isPending, onReview }: RequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<PlayerRegistrationRequest | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [notes, setNotes] = useState('')

  const handleAction = (request: PlayerRegistrationRequest, newAction: 'approve' | 'reject') => {
    setSelectedRequest(request)
    setAction(newAction)
    setNotes('')
  }

  const handleConfirm = async () => {
    if (!selectedRequest || !action) return
    try {
      await onReview?.(
        selectedRequest.id,
        action === 'approve' ? 'approved' : 'rejected',
        notes || undefined,
      )
    } finally {
      setSelectedRequest(null)
      setAction(null)
      setNotes('')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>
      case 'approved':
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="size-3" /> Aprobado</Badge>
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="size-3" /> Rechazado</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Jugador</TableHead>
              <TableHead>Posición</TableHead>
              <TableHead>Dorsal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No hay solicitudes
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <p className="font-medium">{request.player_name}</p>
                  </TableCell>
                  <TableCell>{request.player_position}</TableCell>
                  <TableCell className="text-center">{request.jersey_number}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(request, 'approve')}
                          disabled={isPending}
                          className="gap-1"
                        >
                          <CheckCircle2 className="size-4" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(request, 'reject')}
                          disabled={isPending}
                          className="gap-1"
                        >
                          <XCircle className="size-4" />
                          Rechazar
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={selectedRequest !== null && action !== null}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'approve' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'approve'
                ? `¿Apruebas a ${selectedRequest?.player_name}?`
                : `¿Rechazas a ${selectedRequest?.player_name}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="review-notes" className="text-sm font-medium">
                Notas (opcional)
              </label>
              <Textarea
                id="review-notes"
                placeholder="Escribe tus notas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <AlertDialogAction
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? 'Procesando…' : 'Confirmar'}
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={() => {
              setSelectedRequest(null)
              setAction(null)
            }}
          >
            Cancelar
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
