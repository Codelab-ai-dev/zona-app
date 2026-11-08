import { useState } from 'react'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useActivateTeam, useDeactivateTeam } from '../api'
import { EditTeamDialog } from './edit-team-dialog'
import { TeamCard } from './team-card'

import type { Team } from '../types'

interface TeamsTableProps {
  teams: Team[]
  tournamentNames?: Record<string, string>
}

export function TeamsTable({ teams, tournamentNames }: TeamsTableProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [alertTeam, setAlertTeam] = useState<Team | null>(null)
  const [alertAction, setAlertAction] = useState<'activate' | 'deactivate' | null>(null)

  const activateMutation = useActivateTeam()
  const deactivateMutation = useDeactivateTeam()

  const handleToggleActive = (team: Team) => {
    setAlertTeam(team)
    setAlertAction(team.is_active ? 'deactivate' : 'activate')
  }

  const closeAlert = () => {
    setAlertTeam(null)
    setAlertAction(null)
  }

  // Outcome is reported by the mutation hooks (toast), so fire and forget.
  const handleConfirmAction = () => {
    if (!alertTeam || !alertAction) return
    if (alertAction === 'activate') activateMutation.mutate(alertTeam.id)
    else deactivateMutation.mutate(alertTeam.id)
    closeAlert()
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            tournamentName={tournamentNames?.[team.tournament_id ?? '']}
            disabled={activateMutation.isPending || deactivateMutation.isPending}
            onEdit={setSelectedTeam}
            onToggle={handleToggleActive}
          />
        ))}
      </div>

      {selectedTeam && (
        <EditTeamDialog
          key={selectedTeam.id}
          team={selectedTeam}
          open
          onOpenChange={(open) => !open && setSelectedTeam(null)}
        />
      )}

      <AlertDialog open={alertTeam !== null && alertAction !== null} onOpenChange={(open) => !open && closeAlert()}>
        <AlertDialogContent className="border-white/10 bg-slate-900 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertAction === 'activate' ? 'Activar equipo' : 'Desactivar equipo'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
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
          <AlertDialogCancel className="border-white/10 bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 hover:text-white">Cancelar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
