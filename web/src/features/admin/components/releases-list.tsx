import { useState } from 'react'
import { Copy, Download, Loader2, RefreshCw, Smartphone, Trash2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QueryState } from '@/components/states'
import { ApiError } from '@/lib/api/client'
import { useDeleteStorageObject, useGetStorageUrl, useStorageObjects, type StorageObject } from '../api'
import { formatDate, formatFileSize } from './apk-utils'

const fileName = (release: StorageObject) => release.key.split('/').pop() ?? release.key

/**
 * APK releases of one league: download link, delete with confirmation.
 * readOnly (league admins) hides deletion; the API also forbids it.
 */
export function ReleasesList({ leagueId, readOnly = false }: { leagueId: string; readOnly?: boolean }) {
  const releases = useStorageObjects('app_releases', leagueId)
  const getUrl = useGetStorageUrl()
  const deleteObject = useDeleteStorageObject()
  const [deleteConfirm, setDeleteConfirm] = useState<StorageObject | null>(null)

  const handleDownload = async (release: StorageObject) => {
    try {
      const result = await getUrl.mutateAsync(release.key)
      const a = document.createElement('a')
      a.href = result.url
      a.download = fileName(release)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success('Descarga iniciada')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al obtener el enlace de descarga')
    }
  }

  const handleCopyLink = async (release: StorageObject) => {
    try {
      const result = await getUrl.mutateAsync(release.key)
      await navigator.clipboard.writeText(result.url)
      toast.success('Enlace copiado')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo copiar el enlace')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteObject.mutateAsync(deleteConfirm.key)
      toast.success('APK eliminado exitosamente')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al eliminar el archivo')
    }
    setDeleteConfirm(null)
  }

  return (
    <>
      <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm md:text-base font-semibold text-white">Versiones Disponibles</h3>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Actualizar versiones"
            onClick={() => void releases.refetch()}
            disabled={releases.isFetching}
            className="text-gray-400 hover:text-white hover:bg-slate-700/50 h-7 px-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div>
          <QueryState
            query={releases}
            loadingLabel="Cargando versiones…"
            isEmpty={(res) => res.data.length === 0}
            empty={
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="w-6 h-6 text-gray-500" aria-hidden="true" />
                </div>
                <p className="text-gray-500 text-sm">No hay versiones disponibles para esta liga</p>
              </div>
            }
          >
            {(res) => (
              <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-700/30">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Tamaño</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {res.data.map((release) => (
                      <TableRow key={release.key}>
                        <TableCell className="text-sm font-medium">{fileName(release)}</TableCell>
                        <TableCell className="text-sm">{formatFileSize(release.size)}</TableCell>
                        <TableCell className="text-sm">{formatDate(release.created_at)}</TableCell>
                        <TableCell className="space-x-1 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Descargar ${fileName(release)}`}
                            onClick={() => void handleDownload(release)}
                            disabled={getUrl.isPending}
                          >
                            <Download className="h-3 w-3" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Copiar enlace de ${fileName(release)}`}
                            onClick={() => void handleCopyLink(release)}
                            disabled={getUrl.isPending}
                          >
                            <Copy className="h-3 w-3" aria-hidden="true" />
                          </Button>
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Eliminar ${fileName(release)}`}
                              onClick={() => setDeleteConfirm(release)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </QueryState>
        </div>
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar APK</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar "{deleteConfirm && fileName(deleteConfirm)}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={deleteObject.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteObject.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden="true" />}
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
