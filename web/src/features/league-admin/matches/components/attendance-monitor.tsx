import { useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, RefreshCw, QrCode, ScanFace } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { useMatchAttendance, useTeamPlayers } from '../api'
import type { MatchWithRelations } from '../types'

const confidenceColor = (c: number) => (c >= 0.9 ? 'bg-green-500' : c >= 0.8 ? 'bg-blue-500' : c >= 0.7 ? 'bg-yellow-500' : 'bg-red-500')
const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

interface AttendanceMonitorProps {
  match: MatchWithRelations
}

export function AttendanceMonitor({ match }: AttendanceMonitorProps) {
  // Polls every ATTENDANCE_POLL_MS (see useMatchAttendance).
  const attendance = useMatchAttendance(match.id)
  // Attendance records carry no team, so each player is matched against the team rosters.
  const homePlayers = useTeamPlayers(match.home_team_id)
  const awayPlayers = useTeamPlayers(match.away_team_id)

  const attendanceCounts = useMemo(() => {
    const homeIds = new Set((homePlayers.data?.data ?? []).map((p) => p.id))
    const awayIds = new Set((awayPlayers.data?.data ?? []).map((p) => p.id))
    const present = new Set((attendance.data?.data ?? []).map((r) => r.player_id))
    let home = 0
    let away = 0
    present.forEach((id) => {
      if (homeIds.has(id)) home++
      else if (awayIds.has(id)) away++
    })
    return { home, away }
  }, [attendance.data?.data, homePlayers.data?.data, awayPlayers.data?.data])

  // The original toasted every new check-in; here the polling brings it in.
  const seen = useRef<number | null>(null)
  const count = attendance.data?.data.length
  useEffect(() => {
    if (count === undefined) return
    if (seen.current !== null && count > seen.current) toast.success('Nueva asistencia registrada')
    seen.current = count
  }, [count])

  const totalAttendance = attendanceCounts.home + attendanceCounts.away

  const teamOf = useMemo(() => {
    const map = new Map<string, string>()
    ;(homePlayers.data?.data ?? []).forEach((p) => map.set(p.id, match.home_team_name))
    ;(awayPlayers.data?.data ?? []).forEach((p) => map.set(p.id, match.away_team_name))
    return map
  }, [homePlayers.data?.data, awayPlayers.data?.data, match.home_team_name, match.away_team_name])

  const present = useMemo(
    () => [...(attendance.data?.data ?? [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [attendance.data?.data],
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" aria-hidden="true" />
            Monitoreo de Asistencias
            <Badge variant="outline" className="ml-2">{count ?? 0} registros</Badge>
          </CardTitle>
          {attendance.dataUpdatedAt > 0 && (
            <span className="text-sm text-muted-foreground">Actualizado: {timeOf(new Date(attendance.dataUpdatedAt).toISOString())}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void attendance.refetch()}
            disabled={attendance.isRefetching}
          >
            <RefreshCw className={`size-4 mr-2 ${attendance.isRefetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          role="status"
          aria-live="polite"
          aria-label={`Asistencia: ${attendanceCounts.home} del equipo local, ${attendanceCounts.away} del equipo visitante`}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Equipo Local</p>
              <div className="text-3xl font-bold">{attendanceCounts.home}</div>
              <Badge variant="secondary">
                {match.home_team_name}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Equipo Visitante</p>
              <div className="text-3xl font-bold">{attendanceCounts.away}</div>
              <Badge variant="secondary">
                {match.away_team_name}
              </Badge>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">Total de jugadores presentes</p>
            <p className="text-2xl font-bold">{totalAttendance}</p>
          </div>

          {present.length > 0 && (
            <div className="pt-2 border-t">
              <h3 className="mb-2 text-sm font-medium">Jugadores presentes</h3>
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {present.map((r) => (
                  <li key={`${r.player_id}-${r.timestamp}`} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-sm">
                    <span className="min-w-0 truncate">
                      {r.jersey_number !== undefined && <span className="mr-1 text-muted-foreground">#{r.jersey_number} </span>}
                      {r.player_name}
                      {teamOf.get(r.player_id) && <span className="ml-1 text-xs text-muted-foreground"> ({teamOf.get(r.player_id)})</span>}
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <time dateTime={r.timestamp}>{timeOf(r.timestamp)}</time>
                      <Badge variant="outline" className="gap-1">
                        {r.source === 'qr' ? <QrCode className="size-3" aria-hidden="true" /> : <ScanFace className="size-3" aria-hidden="true" />}
                        {r.source === 'qr' ? 'QR' : 'Facial'}
                      </Badge>
                      {r.source === 'facial' && (
                        <>
                          <Badge variant="outline">{r.recognition_mode === 'quick' ? 'Rápido' : 'Verificado'}</Badge>
                          <span className="text-right">
                            <span className="block font-medium">Confianza: {pct(r.confidence_score)}</span>
                            <span className="block">Similitud: {pct(r.similarity_score)}</span>
                          </span>
                          <span
                            role="img"
                            aria-label={`Nivel de confianza ${pct(r.confidence_score)}`}
                            title={`Confianza: ${pct(r.confidence_score)}`}
                            className={`h-8 w-3 rounded-full ${confidenceColor(r.confidence_score)}`}
                          />
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!attendance.isPending && present.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay asistencias registradas</p>
          )}

          {attendance.isPending && (
            <p className="text-sm text-muted-foreground italic">Cargando datos de asistencia...</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
