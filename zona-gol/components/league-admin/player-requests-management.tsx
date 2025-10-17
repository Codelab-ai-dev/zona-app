"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Database } from "@/lib/supabase/database.types"
import { useAuth } from "@/lib/hooks/use-auth"
import { CheckCircle, XCircle, Clock, Loader2, FileText, User as UserIcon } from "lucide-react"
import { toast } from "sonner"

type PlayerRequest = Database['public']['Tables']['player_registration_requests']['Row']
type PlayerInsert = Database['public']['Tables']['players']['Insert']

interface PlayerRequestsManagementProps {
  leagueId: string
}

interface RequestWithTeam extends PlayerRequest {
  team?: {
    name: string
    tournament_id: string | null
  }
  requester?: {
    name: string
  }
}

export function PlayerRequestsManagement({ leagueId }: PlayerRequestsManagementProps) {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<RequestWithTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingRequest, setReviewingRequest] = useState<RequestWithTeam | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [processing, setProcessing] = useState(false)

  const supabase = createClientSupabaseClient()

  useEffect(() => {
    loadRequests()
  }, [leagueId])

  const loadRequests = async () => {
    try {
      setLoading(true)

      // Get all tournaments for this league
      const { data: tournaments, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('id')
        .eq('league_id', leagueId)

      if (tournamentsError) throw tournamentsError

      const tournamentIds = tournaments?.map(t => t.id) || []

      if (tournamentIds.length === 0) {
        setRequests([])
        return
      }

      // Get all requests for these tournaments with team and user info
      const { data, error } = await supabase
        .from('player_registration_requests')
        .select(`
          *,
          team:teams(name, tournament_id),
          requester:users!player_registration_requests_requested_by_fkey(name)
        `)
        .in('tournament_id', tournamentIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      setRequests(data as RequestWithTeam[] || [])
    } catch (error) {
      console.error('Error loading requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (request: RequestWithTeam) => {
    if (!profile?.id) return

    setProcessing(true)
    try {
      // Create the player
      const playerData: PlayerInsert = {
        name: request.player_name,
        team_id: request.team_id,
        position: request.player_position,
        jersey_number: request.jersey_number,
        birth_date: request.birth_date,
        is_active: true,
      }

      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert(playerData)
        .select()
        .single()

      if (playerError) throw playerError

      // Update request status
      const { error: updateError } = await supabase
        .from('player_registration_requests')
        .update({
          status: 'approved',
          reviewed_by: profile.id,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (updateError) throw updateError

      toast.success('Solicitud aprobada', {
        description: 'El jugador ha sido registrado exitosamente'
      })
      setReviewingRequest(null)
      setReviewNotes("")
      loadRequests()
    } catch (error: any) {
      console.error('Error approving request:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (request: RequestWithTeam) => {
    if (!profile?.id || !reviewNotes.trim()) {
      toast.error('Por favor proporciona una razón para el rechazo')
      return
    }

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('player_registration_requests')
        .update({
          status: 'rejected',
          reviewed_by: profile.id,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (error) throw error

      toast.success('Solicitud rechazada', {
        description: 'El equipo será notificado de tu decisión'
      })
      setReviewingRequest(null)
      setReviewNotes("")
      loadRequests()
    } catch (error: any) {
      console.error('Error rejecting request:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Aprobada</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rechazada</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const reviewedRequests = requests.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Solicitudes de Jugadores Excepcionales</h2>
        <p className="text-muted-foreground">Revisa y aprueba solicitudes de registro fuera del periodo normal</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando solicitudes...</span>
        </div>
      ) : (
        <>
          {/* Pending Requests */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-yellow-600" />
              Pendientes de Revisión ({pendingRequests.length})
            </h3>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No hay solicitudes pendientes</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-yellow-500">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {request.player_name}
                          </CardTitle>
                          <CardDescription>
                            {request.player_position} - #{request.jersey_number}
                          </CardDescription>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Equipo:</p>
                        <p className="text-sm text-muted-foreground">{request.team?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Solicitado por:</p>
                        <p className="text-sm text-muted-foreground">{request.requester?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Justificación:</p>
                        <p className="text-sm text-muted-foreground">{request.reason}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Solicitado: {formatDate(request.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setReviewingRequest(request)
                            setReviewNotes("")
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Revisar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Reviewed Requests */}
          {reviewedRequests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Historial de Solicitudes ({reviewedRequests.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {reviewedRequests.map((request) => (
                  <Card key={request.id} className={`border-l-4 ${request.status === 'approved' ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {request.player_name}
                          </CardTitle>
                          <CardDescription>
                            {request.player_position} - #{request.jersey_number}
                          </CardDescription>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Equipo:</p>
                        <p className="text-sm text-muted-foreground">{request.team?.name}</p>
                      </div>
                      {request.review_notes && (
                        <div>
                          <p className="text-sm font-semibold text-foreground">Notas de revisión:</p>
                          <p className="text-sm text-muted-foreground">{request.review_notes}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Revisado: {request.reviewed_at ? formatDate(request.reviewed_at) : 'N/A'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewingRequest} onOpenChange={() => setReviewingRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Solicitud de Jugador</DialogTitle>
            <DialogDescription>
              Revisa la información y decide si aprobar o rechazar la solicitud
            </DialogDescription>
          </DialogHeader>
          {reviewingRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-semibold">Jugador:</p>
                  <p className="text-sm">{reviewingRequest.player_name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Posición:</p>
                  <p className="text-sm">{reviewingRequest.player_position}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Número:</p>
                  <p className="text-sm">#{reviewingRequest.jersey_number}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Equipo:</p>
                  <p className="text-sm">{reviewingRequest.team?.name}</p>
                </div>
              </div>

              <div>
                <Label className="text-base">Justificación del Equipo:</Label>
                <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded">
                  {reviewingRequest.reason}
                </p>
              </div>

              <div>
                <Label htmlFor="review-notes">Notas de Revisión (opcional para aprobación, requerida para rechazo)</Label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Agrega comentarios sobre tu decisión..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => handleApprove(reviewingRequest)}
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar y Registrar Jugador
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleReject(reviewingRequest)}
                  disabled={processing}
                  variant="destructive"
                  className="flex-1"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar Solicitud
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
