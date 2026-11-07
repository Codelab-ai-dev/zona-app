import { useState } from 'react'
import { CheckCircle2, Edit, Power, XCircle } from 'lucide-react'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useActivateTeam, useDeactivateTeam } from '../api'
import { EditTeamDialog } from './edit-team-dialog'

import type { Team } from '../types'

interface TeamsTableProps {
  teams: Team[]
}

export function TeamsTable({ teams }: TeamsTableProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [alertTeam, setAlertTeam] = useState<Team | null>(null)
  const [alertAction, setAlertAction] = useState<'activate' | 'deactivate' | null>(null)

  const activateMutation = useActivateTeam()
  const deactivateMutation = useDeactivateTeam()

  const handleEdit = (team: Team) => {
    setSelectedTeam(team)
    setIsEditOpen(true)
  }

  const handleToggleActive = (team: Team) => {
    setAlertTeam(team)
    setAlertAction(team.is_active ? 'deactivate' : 'activate')
  }

  const handleConfirmAction = async () => {
    if (!alertTeam || !alertAction) return
    try {
      if (alertAction === 'activate') {
        await activateMutation.mutateAsync(alertTeam.id)
      } else {
        await deactivateMutation.mutateAsync(alertTeam.id)
      }
    } finally {
      setAlertTeam(null)
      setAlertAction(null)
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Equipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No hay equipos
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{team.name}</p>
                      <p className="text-sm text-muted-foreground">{team.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={team.is_active ? 'default' : 'secondary'}>
                      {team.is_active ? (
                        <CheckCircle2 className="mr-1 size-3" />
                      ) : (
                        <XCircle className="mr-1 size-3" />
                      )}
                      {team.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(team)}
                      className="gap-1"
                    >
                      <Edit className="size-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant={team.is_active ? 'ghost' : 'outline'}
                      onClick={() => handleToggleActive(team)}
                      className="gap-1"
                      disabled={activateMutation.isPending || deactivateMutation.isPending}
                    >
                      <Power className="size-4" />
                      {team.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedTeam && (
        <EditTeamDialog
          team={selectedTeam}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onTeamUpdate={() => setSelectedTeam(null)}
        />
      )}

      <AlertDialog open={alertTeam !== null && alertAction !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertAction === 'activate' ? 'Activar equipo' : 'Desactivar equipo'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertAction === 'activate'
                ? `¿Estás seguro de que deseas activar el equipo "${alertTeam?.name}"?`
                : `¿Estás seguro de que deseas desactivar el equipo "${alertTeam?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction
            disabled={activateMutation.isPending || deactivateMutation.isPending}
            onClick={handleConfirmAction}
          >
            {activateMutation.isPending || deactivateMutation.isPending ? 'Procesando…' : 'Confirmar'}
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={() => {
              setAlertTeam(null)
              setAlertAction(null)
            }}
          >
            Cancelar
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
