import { AlertTriangle } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useSuspensions } from '../api'
import type { PlayerStats } from '../types'

/** Cards ranking; players with an active suspension are flagged. */
export function DisciplineTable({ leagueId, rows }: { leagueId: string; rows: PlayerStats[] }) {
  // A failing suspensions request must not hide the cards table, so errors are ignored here.
  const suspensions = useSuspensions(leagueId)
  const suspended = useMemo(
    () => new Map((suspensions.data?.data ?? []).filter((s) => s.status === 'active').map((s) => [s.player_id, s.reason])),
    [suspensions.data],
  )
  const records = useMemo(
    () => rows.map((r) => ({ ...r, total: r.yellow_cards + r.red_cards })).sort((a, b) => b.total - a.total),
    [rows],
  )

  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-300" aria-hidden="true" />
          Disciplina
        </CardTitle>
        <CardDescription className="text-white/80 drop-shadow">Registro de tarjetas amarillas y rojas de todos los jugadores</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-white/20 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/5">
                <TableHead className="w-12 text-center text-white/90">#</TableHead>
                <TableHead className="text-white/90">Jugador</TableHead>
                <TableHead className="text-white/90">Equipo</TableHead>
                <TableHead className="text-center text-white/90">Dorsal</TableHead>
                <TableHead className="text-center text-white/90">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-4 h-6 bg-yellow-400 border border-yellow-500 rounded-sm" aria-hidden="true"></div>
                    Amarillas
                  </div>
                </TableHead>
                <TableHead className="text-center text-white/90">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-4 h-6 bg-red-500 border border-red-600 rounded-sm" aria-hidden="true"></div>
                    Rojas
                  </div>
                </TableHead>
                <TableHead className="text-center text-white/90">Total</TableHead>
                <TableHead className="text-white/90">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record, index) => {
                const isSuspended = suspended.has(record.player_id)
                const reason = suspended.get(record.player_id)
                return (
                  <TableRow key={record.player_id} className={`border-white/20 ${isSuspended ? 'bg-red-500/10' : 'hover:bg-white/5'}`}>
                    <TableCell className="text-center font-medium text-white">{index + 1}</TableCell>
                    <TableCell className="font-medium text-white drop-shadow">{record.player_name}</TableCell>
                    <TableCell className="text-white/80 drop-shadow">{record.team_name}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="backdrop-blur-md bg-white/10 text-white border-white/30">{record.jersey_number}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {record.yellow_cards > 0 ? (
                        <Badge className="backdrop-blur-md bg-yellow-400/80 text-yellow-900 border-0">{record.yellow_cards}</Badge>
                      ) : (
                        <span className="text-white/40">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {record.red_cards > 0 ? (
                        <Badge className="backdrop-blur-md bg-red-500/80 text-white border-0">{record.red_cards}</Badge>
                      ) : (
                        <span className="text-white/40">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="font-bold backdrop-blur-md bg-white/10 text-white border-white/30">{record.total}</Badge>
                    </TableCell>
                    <TableCell>
                      {isSuspended ? (
                        <div className="text-sm">
                          <Badge className="backdrop-blur-md bg-red-500/80 text-white border-0">Suspendido</Badge>
                          {reason && <p className="text-xs text-white/70 mt-1 drop-shadow">{reason}</p>}
                        </div>
                      ) : (
                        <Badge className="backdrop-blur-md bg-green-500/80 text-white border-0">Habilitado</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
