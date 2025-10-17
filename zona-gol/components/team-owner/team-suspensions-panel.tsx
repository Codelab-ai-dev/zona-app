"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Ban, Loader2, AlertTriangle } from "lucide-react"

interface TeamSuspension {
  id: string
  player_id: string
  player_name: string
  jersey_number: number
  suspension_type: string
  reason: string
  matches_to_serve: number
  matches_served: number
  status: string
  created_at: string
}

interface TeamSuspensionsPanelProps {
  teamId: string
}

export function TeamSuspensionsPanel({ teamId }: TeamSuspensionsPanelProps) {
  const [suspensions, setSuspensions] = useState<TeamSuspension[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    loadSuspensions()
  }, [teamId])

  const loadSuspensions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('player_suspensions')
        .select(`
          id,
          player_id,
          suspension_type,
          reason,
          matches_to_serve,
          matches_served,
          status,
          created_at,
          player:players(
            name,
            jersey_number
          )
        `)
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading suspensions:', error)
        return
      }

      const formattedSuspensions = data?.map((s: any) => ({
        id: s.id,
        player_id: s.player_id,
        player_name: s.player?.name || 'Desconocido',
        jersey_number: s.player?.jersey_number || 0,
        suspension_type: s.suspension_type,
        reason: s.reason,
        matches_to_serve: s.matches_to_serve,
        matches_served: s.matches_served,
        status: s.status,
        created_at: s.created_at,
      })) || []

      setSuspensions(formattedSuspensions)
    } catch (error) {
      console.error('Error loading suspensions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSuspensionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      red_card: 'Tarjeta Roja',
      yellow_accumulation: 'Acum. Amarillas',
      disciplinary_committee: 'Comité Disciplinario',
      other: 'Otro',
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5" />
            Jugadores Suspendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Cargando...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ban className="w-5 h-5" />
          Jugadores Suspendidos
        </CardTitle>
        <CardDescription>
          {suspensions.length > 0
            ? `${suspensions.length} jugador${suspensions.length > 1 ? 'es' : ''} con suspensión activa`
            : 'No hay suspensiones activas'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {suspensions.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">
              Todos los jugadores están habilitados para jugar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suspensions.map((suspension) => {
              const matchesRemaining = suspension.matches_to_serve - suspension.matches_served
              return (
                <div
                  key={suspension.id}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {suspension.player_name}
                      </span>
                      <Badge variant="outline">#{suspension.jersey_number}</Badge>
                      <Badge variant="destructive" className="text-xs">
                        SUSPENDIDO
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <Badge variant="secondary" className="text-xs">
                        {getSuspensionTypeLabel(suspension.suspension_type)}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Partidos pendientes:</span>
                      <span className="font-bold text-red-700">
                        {matchesRemaining} de {suspension.matches_to_serve}
                      </span>
                    </div>

                    {suspension.reason && (
                      <div className="pt-2 border-t border-red-200">
                        <p className="text-xs text-gray-700">
                          <span className="font-medium">Motivo:</span> {suspension.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
