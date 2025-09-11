"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AttendanceRecord {
  id: string
  player_id: string
  match_id: string
  recognition_mode: 'quick' | 'verified'
  confidence_score: number
  similarity_score: number
  server_timestamp: string
  local_timestamp: string
  sync_status: string
  players: {
    name: string
    jersey_number: number
  }
  matches: {
    home_team_id: string
    away_team_id: string
    match_date: string
    home_teams: {
      name: string
    }
    away_teams: {
      name: string
    }
  }
}

interface AttendanceMonitorProps {
  matchId?: string
  refreshInterval?: number
}

export function AttendanceMonitor({ matchId, refreshInterval = 10000 }: AttendanceMonitorProps) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const supabase = createClientSupabaseClient()

  const fetchAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      let query = supabase
        .from('facial_attendance')
        .select(`
          *,
          players!inner(
            name,
            jersey_number
          ),
          matches!inner(
            home_team_id,
            away_team_id,
            match_date,
            home_teams:teams!matches_home_team_id_fkey(name),
            away_teams:teams!matches_away_team_id_fkey(name)
          )
        `)
        .gte('server_timestamp', `${today}T00:00:00`)
        .order('server_timestamp', { ascending: false })

      if (matchId) {
        query = query.eq('match_id', matchId)
      }

      const { data, error } = await query

      if (error) throw error

      setAttendance(data || [])
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching attendance:', error)
      toast.error('Error al cargar asistencias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendance()

    // Set up real-time subscription
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facial_attendance',
          ...(matchId && { filter: `match_id=eq.${matchId}` })
        },
        (payload) => {
          console.log('Real-time attendance update:', payload)
          fetchAttendance() // Refresh data on any change
          toast.success('Nueva asistencia registrada')
        }
      )
      .subscribe()

    // Set up periodic refresh
    const interval = setInterval(fetchAttendance, refreshInterval)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [matchId, refreshInterval])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500'
    if (confidence >= 0.8) return 'bg-blue-500'
    if (confidence >= 0.7) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getRecognitionModeLabel = (mode: string) => {
    return mode === 'quick' ? 'Rápido' : 'Verificado'
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Monitoreo de Asistencias
            <Badge variant="outline" className="ml-2">
              {attendance.length} registros hoy
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-sm text-muted-foreground">
                Actualizado: {formatTime(lastUpdate.toISOString())}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAttendance}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay asistencias registradas hoy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attendance.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {record.sync_status === 'synced' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {record.players?.name}
                        {record.players?.jersey_number && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            #{record.players.jersey_number}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(record.server_timestamp)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.matches?.home_teams?.name} vs {record.matches?.away_teams?.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {getRecognitionModeLabel(record.recognition_mode)}
                  </Badge>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Confianza: {(record.confidence_score * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Similitud: {(record.similarity_score * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div
                      className={`w-3 h-8 rounded-full ${getConfidenceColor(record.confidence_score)}`}
                      title={`Confianza: ${(record.confidence_score * 100).toFixed(1)}%`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}