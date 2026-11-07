import { Link } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { initials } from '@/features/leagues/leagues-page'

import type { Discipline, Standing, TopScorer } from '../types'

const num = 'w-12 text-center'

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n)
}

export function StandingsTable({ standings }: { standings: Standing[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table aria-label="Tabla de posiciones">
          <TableHeader>
            <TableRow>
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
              <TableRow key={s.team_id}>
                <TableCell className="text-center font-semibold">{s.position}</TableCell>
                <TableCell>
                  <Link to={`/equipos/${s.team_id}`} className="flex items-center gap-2 hover:underline">
                    <Avatar className="size-6 shrink-0">
                      {s.team_logo && <AvatarImage src={s.team_logo} alt="" />}
                      <AvatarFallback className="text-xs" aria-hidden="true">{initials(s.team_name)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm">{s.team_name}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-center text-sm">{s.matches_played}</TableCell>
                <TableCell className="text-center text-sm">{s.matches_won}</TableCell>
                <TableCell className="text-center text-sm">{s.matches_drawn}</TableCell>
                <TableCell className="text-center text-sm">{s.matches_lost}</TableCell>
                <TableCell className="text-center text-sm">{s.goals_for}</TableCell>
                <TableCell className="text-center text-sm">{s.goals_against}</TableCell>
                <TableCell className="text-center text-sm">{signed(s.goal_difference)}</TableCell>
                <TableCell className="text-center font-bold">
                  {s.points + s.points_adjustment}
                  {s.points_adjustment !== 0 && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      Ajuste {signed(s.points_adjustment)}
                      {s.adjustment_reason && <span className="sr-only">: {s.adjustment_reason}</span>}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function TopScorersTable({ scorers }: { scorers: TopScorer[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table aria-label="Tabla de goleadores">
          <TableHeader>
            <TableRow>
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
              <TableRow key={p.player_id}>
                <TableCell className="text-center font-semibold">{index + 1}</TableCell>
                <TableCell className="font-medium">{p.player_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.team_name}</TableCell>
                <TableCell className="text-center font-bold">{p.goals}</TableCell>
                <TableCell className="text-center">{p.assists}</TableCell>
                <TableCell className="text-center">{p.matches_played}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function DisciplineTable({ rows }: { rows: Discipline[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table aria-label="Tabla de disciplina">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Jugador</TableHead>
              <TableHead scope="col">Equipo</TableHead>
              <TableHead scope="col" className="w-20 text-center">Amarillas</TableHead>
              <TableHead scope="col" className="w-20 text-center">Rojas</TableHead>
              <TableHead scope="col" className="w-20 text-center" title="Partidos jugados">PJ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.player_id}>
                <TableCell className="font-medium">{p.player_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.team_name}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{p.yellow_cards}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{p.red_cards}</Badge>
                </TableCell>
                <TableCell className="text-center">{p.matches_played}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
