import { useState } from 'react'
import { Download, Loader2, RefreshCw, Smartphone, Trash2 } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QueryState } from '@/components/states'
import { ApiError } from '@/lib/api/client'
import { useDeleteStorageObject, useGetStorageUrl, useStorageObjects, type StorageObject } from '../api'
import { formatDate, formatFileSize } from './apk-utils'

const fileName = (release: StorageObject) => release.key.split('/').pop() ?? release.key

/** APK releases of one league: download link, delete with confirmation. */
export function ReleasesList({ leagueId }: { leagueId: string }) {
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Versiones Disponibles</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Actualizar versiones"
            onClick={() => void releases.refetch()}
            disabled={releases.isFetching}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </CardHeader>
        <CardContent>
          <QueryState
            query={releases}
            loadingLabel="Cargando versiones…"
            isEmpty={(res) => res.data.length === 0}
            empty={
              <div className="py-8 text-center">
                <Smartphone className="mx-auto mb-3 h-12 w-12 text-muted-foreground" aria-hidden="true" />
                <p className="text-muted-foreground">No hay versiones disponibles para esta liga</p>
              </div>
            }
          >
            {(res) => (
              <div className="overflow-x-auto rounded-lg border">
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
                            aria-label={`Eliminar ${fileName(release)}`}
                            onClick={() => setDeleteConfirm(release)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
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
