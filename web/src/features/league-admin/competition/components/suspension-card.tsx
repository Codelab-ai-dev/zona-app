import { CheckCircle, Pencil, XCircle } from 'lucide-react'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { useTeamPlayers } from '@/features/league-admin/matches/api'

import { useCancelSuspension, useCompleteSuspension } from '../api'
import type { Suspension } from '../types'

export const suspensionTypeLabels: Record<Suspension['suspension_type'], string> = {
  disciplinary_committee: 'Comité Disciplinario',
  yellow_accumulation: 'Acumulación de Amarillas',
  red_card: 'Tarjeta Roja',
  other: 'Otro',
}

const statusBadge: Record<Suspension['status'], { label: string; className: string }> = {
  active: { label: 'Activa', className: 'backdrop-blur-md bg-red-500/80 text-white border-0' },
  completed: { label: 'Completada', className: 'backdrop-blur-md bg-gray-500/80 text-white border-0' },
  cancelled: { label: 'Cancelada', className: 'backdrop-blur-md bg-white/10 text-white border-white/30' },
}

const dialogClass = 'bg-slate-900 border-white/10 text-white'
const dialogDescription = 'text-gray-400'
const keepButton = 'bg-slate-800/50 border-white/10 text-white hover:bg-slate-700 hover:text-white'
const actionButton = 'backdrop-blur-md text-white border-0'

type Confirming = 'cancel' | 'complete' | null

/** Player name and jersey, resolved from the team roster (the API only returns ids). */
function PlayerCell({ teamId, playerId }: { teamId: string; playerId: string }) {
  const players = useTeamPlayers(teamId)
  const player = players.data?.data.find((p) => p.id === playerId)
  return (
    <div className="flex items-center gap-2">
      <span className="text-white drop-shadow">{player?.name ?? (players.isPending ? 'Cargando…' : 'Jugador desconocido')}</span>
      {player && <Badge className="backdrop-blur-md bg-white/10 text-white border-white/30">#{player.jersey_number}</Badge>}
    </div>
  )
}

interface Props {
  suspension: Suspension
  teamName?: string
  onEdit: () => void
}

export function SuspensionRow({ suspension, teamName, onEdit }: Props) {
  const [confirming, setConfirming] = useState<Confirming>(null)
  const cancel = useCancelSuspension(suspension.id)
  const complete = useCompleteSuspension(suspension.id)
  const isActive = suspension.status === 'active'
  const pending = cancel.isPending || complete.isPending
  const status = statusBadge[suspension.status]

  const run = async (action: 'cancel' | 'complete') => {
    try {
      await (action === 'cancel' ? cancel : complete).mutateAsync()
      setConfirming(null)
    } catch {
      // The mutation already shows the error toast; keep the dialog open.
    }
  }

  return (
    <>
      <TableRow className="border-white/20 hover:bg-white/5">
        <TableCell className="font-medium">
          <PlayerCell teamId={suspension.team_id} playerId={suspension.player_id} />
        </TableCell>
        <TableCell className="text-white/80 drop-shadow">{teamName ?? '—'}</TableCell>
        <TableCell>
          <Badge className="backdrop-blur-md bg-blue-500/80 text-white border-0">{suspensionTypeLabels[suspension.suspension_type]}</Badge>
        </TableCell>
        <TableCell className="max-w-xs text-white/80 drop-shadow">
          <p className="truncate">{suspension.reason}</p>
          {suspension.notes && <p className="truncate text-xs text-white/60">{suspension.notes}</p>}
        </TableCell>
        <TableCell className="text-center">
          <span className="font-medium text-white drop-shadow">
            {suspension.matches_served} / {suspension.matches_to_serve}
          </span>
        </TableCell>
        <TableCell>
          <Badge className={status.className}>{status.label}</Badge>
        </TableCell>
        <TableCell className="text-right">
          {isActive && (
            <div className="flex gap-2 justify-end">
              <Button size="sm" onClick={onEdit} className={`${actionButton} bg-blue-500/80 hover:bg-blue-500/90`}>
                <Pencil className="w-4 h-4 mr-1" aria-hidden="true" />
                Editar
              </Button>
              <Button size="sm" onClick={() => setConfirming('complete')} disabled={pending} className={`${actionButton} bg-green-500/80 hover:bg-green-500/90`}>
                <CheckCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                Completar
              </Button>
              <Button size="sm" onClick={() => setConfirming('cancel')} disabled={pending} className={`${actionButton} bg-red-500/80 hover:bg-red-500/90`}>
                <XCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                Cancelar
              </Button>
            </div>
          )}
        </TableCell>
      </TableRow>

      <AlertDialog open={confirming === 'cancel'} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent className={dialogClass}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Cancelar Suspensión</AlertDialogTitle>
            <AlertDialogDescription className={dialogDescription}>
              ¿Estás seguro de que deseas cancelar esta suspensión? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={keepButton}>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void run('cancel')
              }}
              disabled={cancel.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {cancel.isPending ? 'Cancelando…' : 'Sí, cancelar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirming === 'complete'} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent className={dialogClass}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Completar Suspensión</AlertDialogTitle>
            <AlertDialogDescription className={dialogDescription}>
              Se marcará la suspensión como cumplida y el jugador quedará habilitado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={keepButton}>No, volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void run('complete')
              }}
              disabled={complete.isPending}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {complete.isPending ? 'Completando…' : 'Sí, completar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
