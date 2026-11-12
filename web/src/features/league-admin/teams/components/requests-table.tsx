import { useState } from 'react'
import { CheckCircle, Clock, FileText, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import type { PlayerRegistrationRequest } from '../types'
import { ReviewRequestDialog } from './review-request-dialog'

interface RequestsTableProps {
  requests: PlayerRegistrationRequest[]
  /** team id -> name */
  teamNames: Record<string, string>
  /** user id -> name */
  userNames?: Record<string, string>
  isPending?: boolean
  onReview: (requestId: string, status: 'approved' | 'rejected', notes?: string) => Promise<boolean>
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Badge className="border-0 bg-yellow-500/80 text-white"><Clock className="mr-1 h-3 w-3" aria-hidden="true" />Pendiente</Badge>
    case 'approved':
      return <Badge className="border-0 bg-green-500/80 text-white"><CheckCircle className="mr-1 h-3 w-3" aria-hidden="true" />Aprobada</Badge>
    case 'rejected':
      return <Badge className="border-0 bg-red-500/80 text-white"><XCircle className="mr-1 h-3 w-3" aria-hidden="true" />Rechazada</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

function RequestCard({ request, teamName, accent, children }: { request: PlayerRegistrationRequest; teamName: string; accent: string; children: React.ReactNode }) {
  return (
    <Card className={`border-white/10 border-l-4 bg-slate-900/80 ${accent}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base text-white sm:text-lg">{request.player_name}</CardTitle>
            <CardDescription className="text-gray-400">
              <span>{request.player_position}</span> - #{request.jersey_number}
            </CardDescription>
          </div>
          <StatusBadge status={request.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-white">Equipo:</p>
          <p className="text-sm text-gray-400">{teamName}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

export function RequestsTable({ requests, teamNames, userNames, isPending, onReview }: RequestsTableProps) {
  const [reviewing, setReviewing] = useState<PlayerRegistrationRequest | null>(null)
  const pending = requests.filter((r) => r.status === 'pending')
  const reviewed = requests.filter((r) => r.status !== 'pending')
  const nameOf = (teamId: string) => teamNames[teamId] ?? ''

  return (
    <>
      <div>
        <h2 className="mb-3 flex items-center text-base font-semibold text-white sm:text-lg">
          <Clock className="mr-2 h-5 w-5 text-yellow-500" aria-hidden="true" />
          Pendientes de Revisión ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <FileText className="mx-auto mb-4 h-12 w-12 text-gray-500" aria-hidden="true" />
            <p>No hay solicitudes pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {pending.map((request) => (
              <RequestCard key={request.id} request={request} teamName={nameOf(request.team_id)} accent="border-l-yellow-500">
                {userNames?.[request.requested_by] && (
                  <div>
                    <p className="text-sm font-semibold text-white">Solicitado por:</p>
                    <p className="text-sm text-gray-400">{userNames[request.requested_by]}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-white">Justificación:</p>
                  <p className="text-sm text-gray-400">{request.reason}</p>
                </div>
                <p className="text-xs text-gray-500">Solicitado: {formatDate(request.created_at)}</p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1 bg-green-600 text-white hover:bg-green-700" onClick={() => setReviewing(request)}>
                    <CheckCircle className="mr-1 h-4 w-4" aria-hidden="true" />
                    Revisar
                  </Button>
                </div>
              </RequestCard>
            ))}
          </div>
        )}
      </div>

      {reviewed.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-base font-semibold text-white sm:text-lg">Historial de Solicitudes ({reviewed.length})</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {reviewed.map((request) => (
              <RequestCard key={request.id} request={request} teamName={nameOf(request.team_id)} accent={request.status === 'approved' ? 'border-l-green-500' : 'border-l-red-500'}>
                {request.review_notes && (
                  <div>
                    <p className="text-sm font-semibold text-white">Notas de revisión:</p>
                    <p className="text-sm text-gray-400">{request.review_notes}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500">Revisado: {request.reviewed_at ? formatDate(request.reviewed_at) : 'N/A'}</p>
              </RequestCard>
            ))}
          </div>
        </div>
      )}

      {reviewing && (
        <ReviewRequestDialog
          request={reviewing}
          teamName={nameOf(reviewing.team_id)}
          pending={Boolean(isPending)}
          onClose={() => setReviewing(null)}
          onReview={async (status, notes) => {
            // The dialog stays open (with the typed notes) when the API refuses.
            if (await onReview(reviewing.id, status, notes)) setReviewing(null)
          }}
        />
      )}
    </>
  )
}
