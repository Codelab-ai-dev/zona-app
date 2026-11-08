import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Calendar as CalendarIcon, ClipboardList, Clock, Edit, MapPin, MoreHorizontal, QrCode, Shield, Target, Trash2, Users } from 'lucide-react'

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
  const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  const timeStr = match.match_time ? match.match_time.slice(0, 5) : dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  const isFinished = match.status === 'finished'
  const isScheduled = match.status === 'scheduled'

  const logo = (name: string) => (
    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 md:h-6 md:w-6">
      <Shield className="h-3 w-3 text-gray-500" aria-label={name} role="img" />
    </div>
  )
  const ghost = 'h-7 w-7 border-0 p-0'
  const statusBadge = isFinished ? (
    <Badge className="border-0 bg-gray-500/80 text-white">Finalizado</Badge>
  ) : match.status === 'in_progress' ? (
    <Badge className="border-0 bg-green-500/80 text-white">En juego</Badge>
  ) : match.status === 'cancelled' ? (
    <Badge className="border-0 bg-red-500/80 text-white">Cancelado</Badge>
  ) : (
    <Badge className="border-0 bg-blue-500/80 text-white">Programado</Badge>
  )

  return (
    <div className="space-y-2 p-3 transition-colors hover:bg-slate-700/20 md:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {logo(match.home_team_name)}
          <p className="truncate text-xs font-medium text-white md:text-sm">{match.home_team_name}</p>
        </div>
        <div className="flex-shrink-0 px-2">
          {isFinished ? (
            <span className="text-sm font-bold text-green-400 md:text-base">
              {match.home_score} - {match.away_score}
            </span>
          ) : (
            <span className="text-xs text-gray-500">vs</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <p className="truncate text-xs font-medium text-white md:text-sm">{match.away_team_name}</p>
          {logo(match.away_team_name)}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400 md:gap-3 md:text-xs">
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" aria-hidden="true" />
            {dateStr}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {timeStr}
          </span>
          {match.field_number && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              Campo {match.field_number}
            </span>
          )}
          <Badge className={match.is_published ? 'border-0 bg-green-500/80 text-white' : 'border-orange-500/30 bg-orange-500/20 text-orange-400'}>
            {match.is_published ? 'Publicado' : 'Borrador'}
          </Badge>
          {statusBadge}
        </div>

        <div className="flex items-center gap-1">
          <Button size="sm" onClick={onEdit} title="Editar programación" className={`${ghost} bg-blue-500/20 text-blue-400 hover:bg-blue-500/30`}>
            <Edit className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Editar</span>
          </Button>
          {isScheduled && (
            <Button size="sm" onClick={onResult} title="Ingresar resultado" className={`${ghost} bg-green-500/20 text-green-400 hover:bg-green-500/30`}>
              <Target className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Ingresar resultado</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" aria-label="Más acciones" title="Más acciones" className={`${ghost} bg-white/10 text-white hover:bg-white/20`}>
                <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-white/10 bg-slate-900 text-white">
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
          <Button size="sm" onClick={onDelete} title="Eliminar" className={`${ghost} bg-red-500/20 text-red-400 hover:bg-red-500/30`}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Eliminar</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
