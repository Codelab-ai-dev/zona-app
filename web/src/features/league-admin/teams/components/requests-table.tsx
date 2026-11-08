import { useState } from 'react'
import { CheckCircle2, Clock, FileText, XCircle } from 'lucide-react'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { PlayerRegistrationRequest } from '../types'

interface RequestsTableProps {
  requests: PlayerRegistrationRequest[]
  isPending?: boolean
  onReview?: (requestId: string, status: 'approved' | 'rejected', notes?: string) => void
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

  const close = () => {
    setSelectedRequest(null)
    setAction(null)
    setNotes('')
  }

  const handleConfirm = () => {
    if (!selectedRequest || !action) return
    onReview?.(selectedRequest.id, action === 'approve' ? 'approved' : 'rejected', notes || undefined)
    close()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="border-0 bg-yellow-500/80 text-white">Pendiente</Badge>
      case 'approved':
        return <Badge className="gap-1 border-0 bg-green-500/80 text-white"><CheckCircle2 className="size-3" aria-hidden="true" /> Aprobado</Badge>
      case 'rejected':
        return <Badge className="gap-1 border-0 bg-red-500/80 text-white"><XCircle className="size-3" aria-hidden="true" /> Rechazado</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  const pending = requests.filter((r) => r.status === 'pending')
  const reviewed = requests.filter((r) => r.status !== 'pending')

  const cardHeader = (request: PlayerRegistrationRequest) => (
    <CardHeader>
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-base text-white sm:text-lg">{request.player_name}</CardTitle>
          <CardDescription className="text-gray-400">
            <span>{request.player_position}</span> - #{request.jersey_number}
          </CardDescription>
        </div>
        {getStatusBadge(request.status)}
      </div>
    </CardHeader>
  )

  return (
    <>
      <div>
        <h3 className="mb-3 flex items-center text-base font-semibold text-white sm:text-lg">
          <Clock className="mr-2 h-5 w-5 text-yellow-500" aria-hidden="true" />
          Pendientes de Revisión ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <FileText className="mx-auto mb-4 h-12 w-12 text-gray-500" aria-hidden="true" />
            <p>No hay solicitudes pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {pending.map((request) => (
              <Card key={request.id} className="border-white/10 border-l-4 border-l-yellow-500 bg-slate-900/80">
                {cardHeader(request)}
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Justificación:</p>
                    <p className="text-sm text-gray-400">{request.reason}</p>
                  </div>
                  <p className="text-xs text-gray-500">Solicitado: {formatDate(request.created_at)}</p>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => handleAction(request, 'approve')} disabled={isPending} className="flex-1 bg-green-600 text-white hover:bg-green-700">
                      <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden="true" />
                      Aprobar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleAction(request, 'reject')} disabled={isPending} className="flex-1">
                      <XCircle className="mr-1 h-4 w-4" aria-hidden="true" />
                      Rechazar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {reviewed.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-base font-semibold text-white sm:text-lg">Historial de Solicitudes ({reviewed.length})</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {reviewed.map((request) => (
              <Card key={request.id} className={`border-white/10 border-l-4 bg-slate-900/80 ${request.status === 'approved' ? 'border-l-green-500' : 'border-l-red-500'}`}>
                {cardHeader(request)}
                <CardContent className="space-y-2">
                  {request.review_notes && (
                    <div>
                      <p className="text-sm font-semibold text-white">Notas de revisión:</p>
                      <p className="text-sm text-gray-400">{request.review_notes}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">Revisado: {request.reviewed_at ? formatDate(request.reviewed_at) : 'N/A'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={selectedRequest !== null && action !== null} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent className="max-w-md border-white/10 bg-slate-900 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'approve' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {action === 'approve'
                ? `¿Apruebas a ${selectedRequest?.player_name}?`
                : `¿Rechazas a ${selectedRequest?.player_name}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="review-notes" className="text-sm font-medium text-gray-300">
                Notas (opcional)
              </label>
              <Textarea
                id="review-notes"
                placeholder="Escribe tus notas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="border-white/10 bg-slate-800/50 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <AlertDialogAction
            disabled={isPending}
            onClick={handleConfirm}
          >
            {isPending ? 'Procesando…' : 'Confirmar'}
          </AlertDialogAction>
          <AlertDialogCancel className="border-white/10 bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 hover:text-white">Cancelar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
