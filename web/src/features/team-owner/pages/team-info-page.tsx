import { Calendar, Edit, Globe, Shield } from 'lucide-react'
import { useState } from 'react'

import { QueryState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

import { useTeam, useUpdateTeam } from '../api'
import { TeamForm } from '../components/team-form'
import { glassCard, pageSubtitle, pageTitle } from '../glass'
import type { UpdateTeamRequest } from '../types'
import { formatDate, initials } from '../utils'
import { PlayerStatisticsPage } from './player-statistics-page'

/** Mi Equipo tab: team card with edit dialog, then the player statistics (as in the original). */
export function TeamInfoPage({ teamId }: { teamId: string }) {
  const team = useTeam(teamId)
  const updateTeam = useUpdateTeam()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleUpdateTeam = async (data: UpdateTeamRequest) => {
    // Errors propagate to the form, which maps 422 fields onto its inputs.
    await updateTeam.mutateAsync({ teamId, data })
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={pageTitle}>Información del Equipo</h2>
        <p className={pageSubtitle}>Gestiona los detalles del equipo</p>
      </div>

      <QueryState query={team} loadingLabel="Cargando información del equipo…">
        {(data) => (
          <Card className={glassCard}>
            <CardHeader>
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <Avatar className="w-12 h-12 sm:w-16 sm:h-16">
                    {data.logo && <AvatarImage src={data.logo} alt={data.name} className="object-cover" />}
                    <AvatarFallback className="bg-green-500/30 text-green-300 font-bold text-base sm:text-lg border border-green-300/50">
                      {initials(data.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold leading-none text-xl sm:text-2xl text-white drop-shadow-lg">{data.name}</h3>
                    <CardDescription className="text-sm sm:text-base text-white/70 drop-shadow">/{data.slug}</CardDescription>
                  </div>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20 w-full sm:w-auto">
                      <Edit className="w-4 h-4 mr-2" aria-hidden="true" />
                      Editar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Editar Información del Equipo</DialogTitle>
                      <DialogDescription className="text-slate-400">Actualiza los detalles del equipo</DialogDescription>
                    </DialogHeader>
                    <TeamForm initialData={data} onSubmit={handleUpdateTeam} isLoading={updateTeam.isPending} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-white/80 drop-shadow">{data.description || 'Sin descripción disponible'}</p>

                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-white/80 drop-shadow">
                    <Calendar className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span>Fundado: {formatDate(data.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-white/80 drop-shadow">
                    <Globe className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">URL: /{data.slug}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-white/80 drop-shadow">
                    <Shield className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span>Estado: {data.is_active ? 'Activo' : 'Inactivo'}</span>
                  </div>
                  {data.group_name && (
                    <div className="flex items-center space-x-2 text-xs sm:text-sm text-white/80 drop-shadow">
                      <Shield className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">Grupo: {data.group_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </QueryState>

      <PlayerStatisticsPage teamId={teamId} />
    </div>
  )
}
