import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ClipboardList, Edit, MoreHorizontal, QrCode, Target, Trash2, Users } from 'lucide-react'

import type { MatchWithRelations } from '../types'

interface MatchCardProps {
  match: MatchWithRelations
  onEdit: () => void
  onResult: () => void
  onDelete: () => void
  onQr: () => void
  onAttendance: () => void
  onReport: () => void
}

/** Card displaying a match with status and quick actions. */
export function MatchCard({ match, onEdit, onResult, onDelete, onQr, onAttendance, onReport }: MatchCardProps) {
  const dateObj = new Date(match.match_date)
  const dateStr = dateObj.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = match.match_time || dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  const isFinished = match.status === 'finished'
  const isScheduled = match.status === 'scheduled'

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
      {/* Date & Time */}
      <div className="min-w-fit text-sm">
        <div className="font-mono text-xs text-muted-foreground">{dateStr}</div>
        <div className="font-semibold">{timeStr}</div>
      </div>

      {/* Teams */}
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate font-medium">{match.home_team_name}</span>
          <span className="font-mono font-semibold">
            {isFinished ? (
              <>
                {match.home_score} - {match.away_score}
              </>
            ) : (
              <>vs</>
            )}
          </span>
          <span className="truncate font-medium">{match.away_team_name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {match.field_number && <span>Campo {match.field_number}</span>}
          {match.round && <span>Jornada {match.round}</span>}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2">
        <Badge variant={match.is_published ? 'default' : 'secondary'} className="text-xs">
          {match.is_published ? 'Publicado' : 'Borrador'}
        </Badge>
        <Badge variant={isFinished ? 'outline' : 'secondary'} className="text-xs">
          {match.status === 'finished' ? 'Finalizado' : match.status === 'in_progress' ? 'En juego' : 'Programado'}
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={onEdit} title="Editar programación">
          <Edit className="size-4" aria-hidden="true" />
          <span className="sr-only">Editar</span>
        </Button>
        {isScheduled && (
          <Button size="sm" variant="ghost" onClick={onResult} title="Ingresar resultado">
            <Target className="size-4" aria-hidden="true" />
            <span className="sr-only">Ingresar resultado</span>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" aria-label="Más acciones" title="Más acciones">
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onQr}>
              <QrCode className="size-4" aria-hidden="true" />
              Código QR
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onAttendance}>
              <Users className="size-4" aria-hidden="true" />
              Asistencia
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onReport}>
              <ClipboardList className="size-4" aria-hidden="true" />
              Acta arbitral
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="ghost" onClick={onDelete} title="Eliminar" className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" aria-hidden="true" />
          <span className="sr-only">Eliminar</span>
        </Button>
      </div>
    </div>
  )
}
