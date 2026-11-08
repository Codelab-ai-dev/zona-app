import { Calendar, Edit, Loader2, Lock, Plus, ShieldCheck, Trash2, Trophy, Unlock, UserCheck, Users } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { useDeleteTournament, useTournaments, useUpdateTournament } from '../api'
import type { Tournament } from '../types'
import { TournamentForm } from './tournament-form'

const formatDate = (value: string) => new Date(value).toLocaleDateString('es-ES')
const glassButton = 'backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20'
export const formatLabel: Record<Tournament['tournament_format'], string> = {
  league: '🏆 Liga',
  knockout: '⚡ Eliminación',
  group_knockout: '🌍 Grupos + Eliminación',
}

export function TournamentList({ leagueId }: { leagueId: string }) {
  const [showForm, setShowForm] = useState(false)
  const tournaments = useTournaments(leagueId)

  return (
    <section aria-labelledby="tournaments-title" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 id="tournaments-title" className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
            Gestión de Torneos
          </h2>
          <p className="text-white/80 drop-shadow">Administra los torneos de tu liga</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="h-9 bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm">
          <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
          Nuevo Torneo
        </Button>
      </div>

      {showForm && <TournamentForm leagueId={leagueId} onClose={() => setShowForm(false)} />}

      {tournaments.isPending ? (
        <LoadingState label="Cargando torneos..." />
      ) : tournaments.isError ? (
        <ErrorState error={tournaments.error} onRetry={() => void tournaments.refetch()} />
      ) : tournaments.data.data.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-white/50 drop-shadow" aria-hidden="true" />
          <p className="text-white/80 drop-shadow">Sin torneos</p>
          <p className="text-sm text-white/70 drop-shadow">Crea el primer torneo de la liga</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-2">
          {tournaments.data.data.map((tournament) => (
            <li key={tournament.id}>
              <TournamentCard tournament={tournament} leagueId={leagueId} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function TournamentCard({ tournament, leagueId }: { tournament: Tournament; leagueId: string }) {
  const [showEdit, setShowEdit] = useState(false)
  const update = useUpdateTournament(tournament.id)
  const remove = useDeleteTournament()
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <Card className="h-full backdrop-blur-xl bg-white/10 border-white/20 hover:bg-white/15 transition-all">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center text-white drop-shadow-lg">
                <Trophy className="w-5 h-5 mr-2 text-yellow-400" aria-hidden="true" />
                {tournament.name}
              </CardTitle>
              <CardDescription className="flex items-center mt-2 text-white/70 drop-shadow">
                <Calendar className="w-4 h-4 mr-1" aria-hidden="true" />
                {formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}
              </CardDescription>
              {tournament.max_players ? (
                <CardDescription className="flex items-center mt-1 text-white/70 drop-shadow">
                  <Users className="w-4 h-4 mr-1" aria-hidden="true" />
                  Límite: {tournament.max_players} jugadores por equipo
                </CardDescription>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge className={tournament.is_active ? 'backdrop-blur-md bg-green-500/80 text-white border-0' : 'backdrop-blur-md bg-gray-500/80 text-white border-0'}>
                {tournament.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
              <Badge className={`backdrop-blur-md text-white border-0 flex items-center gap-1 ${tournament.registration_open ? 'bg-blue-500/80' : 'bg-red-500/80'}`}>
                {tournament.registration_open ? <Unlock className="w-3 h-3" aria-hidden="true" /> : <Lock className="w-3 h-3" aria-hidden="true" />}
                {tournament.registration_open ? 'Registros Abiertos' : 'Registros Cerrados'}
              </Badge>
              <Badge className="backdrop-blur-md bg-white/20 text-white border-white/30 flex items-center gap-1">
                {formatLabel[tournament.tournament_format]}
              </Badge>
              {tournament.age_validation_enabled && (
                <Badge className="backdrop-blur-md bg-blue-500/80 text-white border-0 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                  {tournament.min_age ? `+${tournament.min_age}` : ''}
                  {tournament.min_age && tournament.max_age ? '-' : ''}
                  {tournament.max_age ? `${tournament.max_age}` : ''}
                  {!tournament.min_age && !tournament.max_age && 'Edad'}
                </Badge>
              )}
              {tournament.id_document_required && (
                <Badge className="backdrop-blur-md bg-purple-500/80 text-white border-0 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" aria-hidden="true" />
                  INE
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button className={glassButton} size="sm" onClick={() => setShowEdit(true)}>
              <Edit className="w-4 h-4 mr-1" aria-hidden="true" />
              Editar
            </Button>
            <Button className={glassButton} size="sm" disabled={update.isPending} onClick={() => update.mutate({ is_active: !tournament.is_active })}>
              {update.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" aria-hidden="true" />}
              {tournament.is_active ? 'Desactivar' : 'Activar'}
            </Button>
            <Button
              size="sm"
              disabled={update.isPending}
              onClick={() => update.mutate({ registration_open: !tournament.registration_open })}
              className={
                tournament.registration_open
                  ? 'backdrop-blur-md bg-red-500/80 hover:bg-red-500/90 text-white border-0'
                  : 'backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0'
              }
            >
              {tournament.registration_open ? <Lock className="w-4 h-4 mr-1" aria-hidden="true" /> : <Unlock className="w-4 h-4 mr-1" aria-hidden="true" />}
              {tournament.registration_open ? 'Cerrar Registros' : 'Abrir Registros'}
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="backdrop-blur-md bg-red-600/80 hover:bg-red-600/90 text-white border-0"
            >
              <Trash2 className="w-4 h-4 mr-1" aria-hidden="true" />
              Borrar Torneo
            </Button>
          </div>
        </CardContent>
      </Card>

      {showEdit && <TournamentForm leagueId={leagueId} tournament={tournament} onClose={() => setShowEdit(false)} />}
      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        name={tournament.name}
        consequences={['Todos los partidos del torneo', 'Todas las estadísticas de jugadores', 'Los equipos perderán su vinculación']}
        hint='Si solo quieres ocultar temporalmente el torneo, usa "Desactivar".'
        pending={remove.isPending}
        onConfirm={() => remove.mutate(tournament.id, { onSuccess: () => setConfirmDelete(false) })}
      />
    </>
  )
}
