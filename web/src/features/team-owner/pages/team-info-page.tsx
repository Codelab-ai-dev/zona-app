import { useState } from 'react'
import { QueryState } from '@/components/states'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Edit } from 'lucide-react'

import { useTeam, useUpdateTeam } from '../api'
import { TeamForm } from '../components/team-form'
import type { UpdateTeamRequest } from '../types'

export function TeamInfoPage({ teamId }: { teamId: string }) {
  const team = useTeam(teamId)
  const updateTeam = useUpdateTeam()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleUpdateTeam = async (data: UpdateTeamRequest) => {
    try {
      await updateTeam.mutateAsync({ teamId, data })
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Failed to update team:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Información del Equipo</h2>
          <p className="text-muted-foreground">Gestiona los detalles de tu equipo.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Información del Equipo</DialogTitle>
              <DialogDescription>Actualiza los detalles del equipo.</DialogDescription>
            </DialogHeader>
            {team.data && (
              <TeamForm initialData={team.data} onSubmit={handleUpdateTeam} isLoading={updateTeam.isPending} />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <QueryState query={team} loadingLabel="Cargando información del equipo…">
        {(data) => (
          <div className="space-y-6">
            {/* Logo and basic info */}
            <div className="rounded-lg border p-6">
              {data.logo && <img src={data.logo} alt={data.name} className="mb-4 h-48 w-auto rounded-lg object-cover" />}
              <h1 className="text-3xl font-bold">{data.name}</h1>
              <p className="text-muted-foreground">/{data.slug}</p>
              {data.description && <p className="mt-4 text-base">{data.description}</p>}
            </div>

            {/* Details */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border p-6">
                <h3 className="font-semibold">Detalles</h3>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <p className="font-medium">{data.is_active ? 'Activo' : 'Inactivo'}</p>
                  </div>
                  {data.group_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Grupo</p>
                      <p className="font-medium">{data.group_name}</p>
                    </div>
                  )}
                  {data.league_id && (
                    <div>
                      <p className="text-sm text-muted-foreground">Liga ID</p>
                      <p className="font-mono text-sm">{data.league_id}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-6">
                <h3 className="font-semibold">Información de Registro</h3>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Creado</p>
                    <p className="font-medium">
                      {new Date(data.created_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Actualizado</p>
                    <p className="font-medium">
                      {new Date(data.updated_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </QueryState>
    </div>
  )
}
