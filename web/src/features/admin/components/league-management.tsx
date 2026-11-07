import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Edit, ToggleLeft, ToggleRight, Settings } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Gestión de Ligas</h2>
          <p className="text-sm text-muted-foreground">Administra todas las ligas del sistema</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Liga
        </Button>
      </div>

      <LeagueFormDialog key={editingLeague?.id ?? 'new'} open={formOpen} onOpenChange={handleFormClose} league={editingLeague} />
      <LeagueFeaturesEditor key={editingFeatures?.id ?? 'none'} open={!!editingFeatures} onOpenChange={(open) => !open && setEditingFeatures(null)} league={editingFeatures} />

      <QueryState query={leagues} loadingLabel="Cargando ligas…" isEmpty={(res) => res.data.length === 0}>
        {(res) => (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {res.data.map((league) => (
              <Card key={league.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{league.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">/{league.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      {league.is_active ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-200">
                          Inactiva
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 pb-3">
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{league.description}</p>
                  <div className="text-xs text-muted-foreground">
                    Producto: <span className="font-medium">{league.product_mode === 'full' ? 'Completo' : 'Web Only'}</span>
                  </div>
                </CardContent>

                <div className="border-t px-4 py-3 flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEditClick(league)} className="flex-1">
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingFeatures(league)}
                    className="flex-1"
                    title="Configurar features"
                  >
                    <Settings className="mr-1 h-3 w-3" />
                    Features
                  </Button>
                  {league.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(league)}
                      disabled={toggleStatus.isPending}
                      className="flex-1 text-destructive hover:text-destructive"
                    >
                      <ToggleRight className="mr-1 h-3 w-3" />
                      Desactivar liga
                    </Button>
                  )}
                  {!league.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(league)}
                      disabled={toggleStatus.isPending}
                      className="flex-1"
                    >
                      <ToggleLeft className="mr-1 h-3 w-3" />
                      Activar
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryState>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
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
