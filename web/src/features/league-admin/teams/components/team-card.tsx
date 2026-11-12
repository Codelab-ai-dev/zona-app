import { CheckCircle, Edit, Loader2, Shield, Trash2, Users, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { useDeleteTeam } from '../api'
import type { Team } from '../types'

interface TeamCardProps {
  team: Team
  tournamentName?: string
  /** Name of the team's owner, when known. */
  ownerName?: string
  disabled?: boolean
  onEdit: (team: Team) => void
  onToggle: (team: Team) => void
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

export function TeamCard({ team, tournamentName, ownerName, disabled, onEdit, onToggle }: TeamCardProps) {
  const remove = useDeleteTeam()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [navigating, setNavigating] = useState(false)

  const openTeam = () => {
    setNavigating(true)
    void navigate(`/equipos/${team.id}`)
  }

  return (
    <Card className="relative border-white/20 bg-white/10 backdrop-blur-xl transition-all hover:bg-white/15">
      {navigating && (
        <div role="status" className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-green-400 motion-reduce:animate-none" aria-hidden="true" />
            <p className="text-sm font-medium text-white">Cargando equipo...</p>
          </div>
        </div>
      )}
      <CardHeader
        className="cursor-pointer"
        onClick={(e) => {
          // The title link navigates by itself; the rest of the header is a mouse shortcut.
          if (!(e.target as HTMLElement).closest('a')) openTeam()
        }}
      >
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            {team.logo ? (
              <AvatarImage src={team.logo} alt={`${team.name} logo`} />
            ) : (
              <AvatarFallback className="bg-green-500/20 font-bold text-green-400">{initials(team.name)}</AvatarFallback>
            )}
          </Avatar>
          <div>
            <CardTitle className="text-base text-white drop-shadow-lg sm:text-lg">
              <Link to={`/equipos/${team.id}`} onClick={() => setNavigating(true)} className="hover:text-blue-300">
                {team.name}
              </Link>
            </CardTitle>
            <CardDescription className="text-white/70 drop-shadow">/{team.slug}</CardDescription>
          </div>
        </div>
        <Badge className={team.is_active ? 'w-fit border-0 bg-green-500/80 text-white' : 'w-fit border-0 bg-gray-500/80 text-white'}>
          {team.is_active ? 'Aprobado' : 'Pendiente'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {team.description && <p className="text-sm text-white/80 drop-shadow">{team.description}</p>}
          {team.tournament_id && (
            <div className="flex items-center text-sm text-blue-300 drop-shadow">
              <Shield className="mr-1 h-4 w-4" aria-hidden="true" />
              Torneo: {tournamentName ?? 'Torneo asignado'}
            </div>
          )}
          {team.group_name && (
            <div className="flex items-center text-sm text-white/70 drop-shadow">
              <Shield className="mr-1 h-4 w-4" aria-hidden="true" />
              Grupo {team.group_name}
            </div>
          )}
          {ownerName && (
            <div className="flex items-center text-sm text-white/70 drop-shadow">
              <Users className="mr-1 h-4 w-4" aria-hidden="true" />
              Propietario: {ownerName}
            </div>
          )}
          <div className="flex items-center text-sm text-white/70 drop-shadow">
            <Shield className="mr-1 h-4 w-4" aria-hidden="true" />
            Creado: {new Date(team.created_at).toLocaleDateString('es-ES')}
          </div>
          <div className="space-y-2 pt-2">
            <div className="flex space-x-2">
              <Button size="sm" onClick={() => onEdit(team)} className="flex-1 border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20">
                <Edit className="mr-1 h-4 w-4" aria-hidden="true" />
                Editar
              </Button>
              <Button
                size="sm"
                disabled={disabled}
                onClick={() => onToggle(team)}
                className={
                  team.is_active
                    ? 'flex-1 border-0 bg-yellow-500/80 text-white backdrop-blur-md hover:bg-yellow-500/90'
                    : 'flex-1 border-0 bg-green-500/80 text-white backdrop-blur-md hover:bg-green-500/90'
                }
              >
                {team.is_active ? <XCircle className="mr-1 h-4 w-4" aria-hidden="true" /> : <CheckCircle className="mr-1 h-4 w-4" aria-hidden="true" />}
                {team.is_active ? 'Desactivar' : 'Activar'}
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="w-full border-0 bg-red-500/80 text-white backdrop-blur-md hover:bg-red-500/90"
            >
              <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
              Eliminar Equipo
            </Button>
          </div>
        </div>
      </CardContent>
      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        name={team.name}
        consequences={['Todos los jugadores del equipo', 'Todas las estadísticas', 'El historial de partidos (la tabla se recalcula)']}
        hint="Considera desactivar el equipo si solo quieres ocultarlo."
        pending={remove.isPending}
        onConfirm={() => remove.mutate(team.id, { onSuccess: () => setConfirmDelete(false) })}
      />
    </Card>
  )
}
