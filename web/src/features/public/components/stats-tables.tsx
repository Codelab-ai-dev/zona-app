import { Link } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { initials } from '@/features/leagues/leagues-page'

import type { Discipline, Standing, TopScorer } from '../types'
import { panelClass } from './public-shell'

const num = 'w-12 text-center'

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n)
}

export function StandingsTable({ standings }: { standings: Standing[] }) {
  return (
    <div className={`${panelClass} overflow-x-auto p-2 md:p-4`}>
        <Table className="text-white" aria-label="Tabla de posiciones">
          <TableHeader className="[&_th]:h-9 [&_th]:text-xs [&_th]:font-medium [&_th]:text-gray-500">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead scope="col" className="w-12 text-center">#</TableHead>
              <TableHead scope="col">Equipo</TableHead>
              <TableHead scope="col" className={num} title="Partidos jugados">PJ</TableHead>
              <TableHead scope="col" className={num} title="Ganados">G</TableHead>
              <TableHead scope="col" className={num} title="Empatados">E</TableHead>
              <TableHead scope="col" className={num} title="Perdidos">P</TableHead>
              <TableHead scope="col" className={num} title="Goles a favor">GF</TableHead>
              <TableHead scope="col" className={num} title="Goles en contra">GC</TableHead>
              <TableHead scope="col" className={num} title="Diferencia de goles">DG</TableHead>
              <TableHead scope="col" className="w-16 text-center" title="Puntos">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((s) => (
              <TableRow key={s.team_id} className="border-white/5 hover:bg-white/5">
                <TableCell className="text-center font-bold text-white">{s.position}</TableCell>
                <TableCell>
                  <Link to={`/equipos/${s.team_id}`} className="flex items-center gap-2 text-white hover:text-green-400 hover:underline">
                    <Avatar className="size-6 shrink-0 border border-white/10 md:size-8">
                      {s.team_logo && <AvatarImage src={s.team_logo} alt="" />}
                      <AvatarFallback className="bg-green-500/20 text-xs font-bold text-green-400" aria-hidden="true">{initials(s.team_name)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm">{s.team_name}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-center text-sm text-gray-400">{s.matches_played}</TableCell>
                <TableCell className="text-center text-sm text-gray-400">{s.matches_won}</TableCell>
                <TableCell className="text-center text-sm text-gray-400">{s.matches_drawn}</TableCell>
                <TableCell className="text-center text-sm text-gray-400">{s.matches_lost}</TableCell>
                <TableCell className="text-center text-sm text-gray-400">{s.goals_for}</TableCell>
                <TableCell className="text-center text-sm text-gray-400">{s.goals_against}</TableCell>
                <TableCell className={`text-center text-sm ${s.goal_difference > 0 ? 'text-green-400' : s.goal_difference < 0 ? 'text-red-400' : 'text-gray-500'}`}>{signed(s.goal_difference)}</TableCell>
                <TableCell className="text-center font-bold">
                  {s.points + s.points_adjustment}
                  {s.points_adjustment !== 0 && (
                    <span className="block text-xs font-normal text-gray-400">
                      Ajuste {signed(s.points_adjustment)}
                      {s.adjustment_reason && <span className="sr-only">: {s.adjustment_reason}</span>}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  )
}

export function TopScorersTable({ scorers }: { scorers: TopScorer[] }) {
  return (
    <div className={`${panelClass} overflow-x-auto p-2 md:p-4`}>
        <Table className="text-white" aria-label="Tabla de goleadores">
          <TableHeader className="[&_th]:h-9 [&_th]:text-xs [&_th]:font-medium [&_th]:text-gray-500">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead scope="col" className="w-12 text-center">#</TableHead>
              <TableHead scope="col">Jugador</TableHead>
              <TableHead scope="col">Equipo</TableHead>
              <TableHead scope="col" className="w-16 text-center">Goles</TableHead>
              <TableHead scope="col" className="w-16 text-center">Asistencias</TableHead>
              <TableHead scope="col" className="w-16 text-center" title="Partidos jugados">PJ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scorers.map((p, index) => (
              <TableRow key={p.player_id} className="border-white/5 hover:bg-white/5">
                <TableCell className="text-center font-semibold">{index + 1}</TableCell>
                <TableCell className="font-medium">{p.player_name}</TableCell>
                <TableCell className="text-sm text-gray-400">{p.team_name}</TableCell>
                <TableCell className="text-center font-bold text-green-400">{p.goals}</TableCell>
                <TableCell className="text-center text-blue-400">{p.assists}</TableCell>
                <TableCell className="text-center text-gray-400">{p.matches_played}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  )
}

export function DisciplineTable({ rows }: { rows: Discipline[] }) {
  return (
    <div className={`${panelClass} overflow-x-auto p-2 md:p-4`}>
        <Table className="text-white" aria-label="Tabla de disciplina">
          <TableHeader className="[&_th]:h-9 [&_th]:text-xs [&_th]:font-medium [&_th]:text-gray-500">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead scope="col">Jugador</TableHead>
              <TableHead scope="col">Equipo</TableHead>
              <TableHead scope="col" className="w-20 text-center">Amarillas</TableHead>
              <TableHead scope="col" className="w-20 text-center">Rojas</TableHead>
              <TableHead scope="col" className="w-20 text-center" title="Partidos jugados">PJ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.player_id} className="border-white/5 hover:bg-white/5">
                <TableCell className="font-medium">{p.player_name}</TableCell>
                <TableCell className="text-sm text-gray-400">{p.team_name}</TableCell>
                <TableCell className="text-center">
                  <Badge className="border-0 bg-yellow-500/20 text-yellow-400">{p.yellow_cards}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="border-0 bg-red-500/20 text-red-400">{p.red_cards}</Badge>
                </TableCell>
                <TableCell className="text-center text-gray-400">{p.matches_played}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  )
}
