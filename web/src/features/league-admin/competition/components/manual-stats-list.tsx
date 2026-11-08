import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useSetManualStats, type ManualStats } from '../api'

/** Manual (extemporaneous) entries of a tournament, with edit and delete. */
export function ManualStatsList({
  tournamentId,
  entries,
  onEdit,
}: {
  tournamentId: string
  entries: ManualStats[]
  onEdit: (entry: ManualStats) => void
}) {
  const [deleting, setDeleting] = useState<ManualStats | null>(null)
  const remove = useSetManualStats(tournamentId)

  const confirm = () => {
    if (!deleting) return
    remove.mutate(
      { playerId: deleting.player_id, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 },
      { onSuccess: () => setDeleting(null) },
    )
  }

  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white drop-shadow-lg">Estadísticas manuales</CardTitle>
        <CardDescription className="text-white/80 drop-shadow">
          Goles extemporáneos agregados a mano; ya están incluidos en las tablas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/5">
                <TableHead className="text-white/90">Jugador</TableHead>
                <TableHead className="text-white/90">Equipo</TableHead>
                <TableHead className="text-center text-white/90">Goles</TableHead>
                <TableHead className="text-center text-white/90">Asistencias</TableHead>
                <TableHead className="text-center text-white/90">Amarillas</TableHead>
                <TableHead className="text-center text-white/90">Rojas</TableHead>
                <TableHead className="text-center text-white/90">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.player_id} className="border-white/20 hover:bg-white/5">
                  <TableCell className="font-semibold text-white">
                    {entry.player_name} <Badge className="ml-1 bg-white/10 text-white border-white/30">#{entry.jersey_number}</Badge>
                  </TableCell>
                  <TableCell className="text-white/80">{entry.team_name}</TableCell>
                  <TableCell className="text-center text-white/80">{entry.goals}</TableCell>
                  <TableCell className="text-center text-white/80">{entry.assists}</TableCell>
                  <TableCell className="text-center text-white/80">{entry.yellow_cards}</TableCell>
                  <TableCell className="text-center text-white/80">{entry.red_cards}</TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(entry)} aria-label={`Editar manuales de ${entry.player_name}`} className="text-white/70 hover:text-white hover:bg-white/10">
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(entry)} aria-label={`Eliminar manuales de ${entry.player_name}`} className="text-red-300 hover:text-red-200 hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        name={deleting ? `Estadísticas manuales de ${deleting.player_name}` : ''}
        consequences={
          deleting
            ? [
                `${deleting.goals} gol(es) y ${deleting.assists} asistencia(s) extemporáneos`,
                `${deleting.yellow_cards} amarilla(s) y ${deleting.red_cards} roja(s) manuales`,
                'Las tablas de goleadores y disciplina dejarán de contarlos',
              ]
            : []
        }
        hint="Los goles y tarjetas de partidos registrados no se tocan."
        pending={remove.isPending}
        onConfirm={confirm}
      />
    </Card>
  )
}
