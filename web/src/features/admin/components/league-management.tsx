import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Settings } from 'lucide-react'
import { QueryState } from '@/components/states'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAdminLeagues, useToggleLeagueStatus } from '../api'
import { LeagueFormDialog } from './league-form-dialog'
import { LeagueFeaturesEditor } from './league-features-editor'
import type { League } from '../types'

export function LeagueManagement() {
  const leagues = useAdminLeagues()
  const toggleStatus = useToggleLeagueStatus()
  const [formOpen, setFormOpen] = useState(false)
  const [editingLeague, setEditingLeague] = useState<League | null>(null)
  const [editingFeatures, setEditingFeatures] = useState<League | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<League | null>(null)

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

  const handleFormClose = () => {
    setFormOpen(false)
    setEditingLeague(null)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white">Gestión de Ligas</h2>
          <p className="text-gray-500 text-sm">Administra todas las ligas del sistema</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setFormOpen(true)} className="bg-green-500 hover:bg-green-600 text-white border-0" size="sm">
            <Plus className="w-3 h-3 mr-1" />
            Nueva Liga
          </Button>
        </div>
      </div>

      <LeagueFormDialog key={editingLeague?.id ?? 'new'} open={formOpen} onOpenChange={handleFormClose} league={editingLeague} />
      <LeagueFeaturesEditor key={editingFeatures?.id ?? 'none'} open={!!editingFeatures} onOpenChange={(open) => !open && setEditingFeatures(null)} league={editingFeatures} />

      <QueryState query={leagues} loadingLabel="Cargando ligas…" isEmpty={(res) => res.data.length === 0}>
        {(res) => (
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {res.data.map((league) => (
              <div key={league.id} className="rounded-xl bg-slate-800/50 border border-white/10 p-3 md:p-4 hover:bg-slate-800/70 transition-all">
                <div className="flex items-start gap-3 mb-3">
                  {league.logo ? (
                    <img
                      src={league.logo}
                      alt={`Logo de ${league.name}`}
                      className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-lg bg-slate-700/50 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-400 font-bold text-sm">{league.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm md:text-base truncate">{league.name}</h3>
                    <p className="text-[10px] md:text-xs text-gray-500 truncate">/{league.slug}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${league.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {league.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${league.product_mode === 'full' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {league.product_mode === 'full' ? 'Completo' : 'Web'}
                      </span>
                    </div>
                  </div>
                </div>

                {league.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{league.description}</p>}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(league)}
                    aria-label={`Editar ${league.name}`}
                    className="bg-slate-700/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700 h-7 px-2"
                  >
                    <Edit className="w-3 h-3" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingFeatures(league)}
                    className="bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 h-7 px-2"
                    title="Configurar features"
                    aria-label={`Configurar features de ${league.name}`}
                  >
                    <Settings className="w-3 h-3" aria-hidden="true" />
                  </Button>
                  {league.is_active ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirm(league)}
                      disabled={toggleStatus.isPending}
                      aria-label="Desactivar liga"
                      className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 h-7 px-2 text-[10px]"
                    >
                      Desactivar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(league)}
                      disabled={toggleStatus.isPending}
                      className="bg-slate-700/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700 h-7 px-2 text-[10px]"
                    >
                      Activar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar liga</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres desactivar "{deleteConfirm?.name}"? Se ocultará de la interfaz pública pero se puede reactivar después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteConfirm) {
                  await handleToggleStatus(deleteConfirm)
                  setDeleteConfirm(null)
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
