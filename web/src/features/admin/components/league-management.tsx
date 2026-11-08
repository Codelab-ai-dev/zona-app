import { useRef, useState } from 'react'
import { Loader2, Plus, Power } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { QueryState } from '@/components/states'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ApiError } from '@/lib/api/client'
import { useActivateLeagues, useAdminLeagues, useDeleteLeague, useToggleLeagueStatus } from '../api'
import { CredentialsDialog } from './credentials-dialog'
import { LeagueCard } from './league-card'
import { LeagueFeaturesEditor } from './league-features-editor'
import { LeagueFormDialog, type CreatedLeagueInfo } from './league-form-dialog'
import type { League } from '../types'

const DELETE_CONSEQUENCES = [
  'Se eliminan todos los torneos de la liga',
  'Se eliminan los equipos y jugadores',
  'Se eliminan los partidos y estadísticas',
  'Se eliminan las finanzas (cuotas, multas y pagos)',
  'Se eliminan los vínculos de WhatsApp',
  'Los usuarios y los videos se conservan, pero quedan sin liga',
]

export function LeagueManagement() {
  const leagues = useAdminLeagues()
  const toggleStatus = useToggleLeagueStatus()
  const activateAll = useActivateLeagues()
  const deleteLeague = useDeleteLeague()
  const [formOpen, setFormOpen] = useState(false)
  // Changes after an edit or a finished creation so a reopened dialog starts clean.
  const [formSeq, setFormSeq] = useState(0)
  const justCreated = useRef(false)
  const [editingLeague, setEditingLeague] = useState<League | null>(null)
  const [editingFeatures, setEditingFeatures] = useState<League | null>(null)
  const [deactivating, setDeactivating] = useState<League | null>(null)
  const [deleting, setDeleting] = useState<League | null>(null)
  const [credentials, setCredentials] = useState<{ email: string; password: string; leagueName: string } | null>(null)

  const handleEditClick = (league: League) => {
    setEditingLeague(league)
    setFormOpen(true)
  }

  const handleToggleStatus = async (league: League) => {
    try {
      await toggleStatus.mutateAsync({ id: league.id, is_active: !league.is_active })
      toast.success(`Liga ${!league.is_active ? 'activada' : 'desactivada'} exitosamente`)
    } catch {
      toast.error('Error al cambiar el estado de la liga')
    }
  }

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      // A cancelled create keeps its state (and what a failed attempt already created).
      if (editingLeague || justCreated.current) setFormSeq((n) => n + 1)
      justCreated.current = false
      setEditingLeague(null)
    }
  }

  const handleCreated = ({ leagueName, credentials: creds }: CreatedLeagueInfo) => {
    justCreated.current = true
    if (creds) setCredentials({ ...creds, leagueName })
  }

  const handleActivateAll = async (inactive: League[]) => {
    const result = await activateAll.mutateAsync(inactive)
    if (result.failed.length === 0) {
      toast.success(`${result.activated} ${result.activated === 1 ? 'liga activada' : 'ligas activadas'} exitosamente`)
      return
    }
    const names = result.failed.map((f) => f.league.name).join(', ')
    toast.error(`Se activaron ${result.activated} de ${inactive.length} ligas. No se pudo activar: ${names}`)
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteLeague.mutateAsync(deleting.id)
      toast.success(`Liga "${deleting.name}" eliminada`)
      setDeleting(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al eliminar la liga')
    }
  }

  const inactive = (leagues.data?.data ?? []).filter((l) => !l.is_active)

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white">Gestión de Ligas</h2>
          <p className="text-gray-500 text-sm">Administra todas las ligas del sistema</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {inactive.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleActivateAll(inactive)}
              disabled={activateAll.isPending}
              className="bg-slate-700/50 border-white/10 text-gray-300 hover:text-white hover:bg-slate-700"
            >
              {activateAll.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" aria-hidden="true" /> : <Power className="w-3 h-3 mr-1" aria-hidden="true" />}
              {activateAll.isPending ? 'Activando…' : `Activar todas (${inactive.length})`}
            </Button>
          )}
          <Button onClick={() => setFormOpen(true)} className="bg-green-500 hover:bg-green-600 text-white border-0" size="sm">
            <Plus className="w-3 h-3 mr-1" aria-hidden="true" />
            Nueva Liga
          </Button>
        </div>
      </div>

      <LeagueFormDialog
        key={`${editingLeague?.id ?? 'new'}-${formSeq}`}
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        league={editingLeague}
        onCreated={handleCreated}
      />
      <LeagueFeaturesEditor key={editingFeatures?.id ?? 'none'} open={!!editingFeatures} onOpenChange={(open) => !open && setEditingFeatures(null)} league={editingFeatures} />
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />

      <QueryState query={leagues} loadingLabel="Cargando ligas…" isEmpty={(res) => res.data.length === 0}>
        {(res) => (
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {res.data.map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                busy={toggleStatus.isPending}
                onEdit={() => handleEditClick(league)}
                onFeatures={() => setEditingFeatures(league)}
                onDeactivate={() => setDeactivating(league)}
                onActivate={() => void handleToggleStatus(league)}
                onDelete={() => setDeleting(league)}
              />
            ))}
          </div>
        )}
      </QueryState>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        name={deleting?.name ?? ''}
        consequences={DELETE_CONSEQUENCES}
        hint="Si solo quieres ocultar la liga, usa Desactivar: se puede reactivar después."
        pending={deleteLeague.isPending}
        onConfirm={() => void handleDelete()}
      />

      <AlertDialog open={!!deactivating} onOpenChange={() => setDeactivating(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar liga</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres desactivar "{deactivating?.name}"? Se ocultará de la interfaz pública pero se puede reactivar después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deactivating) {
                  await handleToggleStatus(deactivating)
                  setDeactivating(null)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desactivar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
