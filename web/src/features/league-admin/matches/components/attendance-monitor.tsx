import { useMemo } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { useMatchAttendance, useTeamPlayers } from '../api'
import type { MatchWithRelations } from '../types'

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

  const totalAttendance = attendanceCounts.home + attendanceCounts.away

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" aria-hidden="true" />
            Monitoreo de Asistencias
          </CardTitle>
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

          {attendance.isPending && (
            <p className="text-sm text-muted-foreground italic">Cargando datos de asistencia...</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
