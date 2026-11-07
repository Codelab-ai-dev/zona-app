import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Download, Trash2, RefreshCw, FileArchive, Smartphone, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminLeagues, useUploadStorage, useStorageObjects, useGetStorageUrl, useDeleteStorageObject } from '../api'
import { QueryState } from '@/components/states'
import type { StorageObject } from '../api'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function AppReleases() {
  const leagues = useAdminLeagues({ limit: 100 })
  const uploadStorage = useUploadStorage()
  const getUrl = useGetStorageUrl()
  const deleteObject = useDeleteStorageObject()

  const [selectedLeague, setSelectedLeague] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<StorageObject | null>(null)

  // Only fetch releases if league is selected
  const releases = useStorageObjects('app_releases', selectedLeague)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.apk')) {
        toast.error('Solo se permiten archivos APK')
        return
      }
      if (file.size > 150 * 1024 * 1024) {
        toast.error('El archivo es demasiado grande (máximo 150MB)')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Por favor selecciona un archivo APK')
      return
    }
    if (!selectedLeague) {
      toast.error('Por favor selecciona una liga')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('scope', 'app_releases')
      formData.append('scope_id', selectedLeague)

      await uploadStorage.mutateAsync(formData)
      toast.success('APK subido exitosamente')
      setSelectedFile(null)
      const input = document.getElementById('apk-upload') as HTMLInputElement
      if (input) input.value = ''
      void releases.refetch()
    } catch {
      toast.error('Error al subir el archivo')
    }
  }

  const handleDownload = async (release: StorageObject) => {
    try {
      const result = await getUrl.mutateAsync(release.key)
      const a = document.createElement('a')
      a.href = result.url
      a.download = release.filename || release.key
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success('Descarga iniciada')
    } catch {
      toast.error('Error al obtener el enlace de descarga')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    try {
      await deleteObject.mutateAsync(deleteConfirm.key)
      toast.success('APK eliminado exitosamente')
      setDeleteConfirm(null)
      void releases.refetch()
    } catch {
      toast.error('Error al eliminar el archivo')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Gestión de Versiones APK
        </h2>
        <p className="text-sm text-muted-foreground">Administra las versiones del APK</p>
      </div>

      <QueryState query={leagues} loadingLabel="Cargando ligas…" isEmpty={(res) => res.data.length === 0}>
        {(res) => (
          <>
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Subir APK</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="league-select">Seleccionar Liga *</Label>
                  <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                    <SelectTrigger id="league-select">
                      <SelectValue placeholder="Elige una liga" />
                    </SelectTrigger>
                    <SelectContent>
                      {res.data.map((league) => (
                        <SelectItem key={league.id} value={league.id}>
                          {league.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLeague && (
                  <div>
                    <Label htmlFor="apk-upload" className="flex items-center gap-1">
                      <FileArchive className="h-4 w-4" />
                      Seleccionar APK (máx. 150MB) *
                    </Label>
                    <Input
                      id="apk-upload"
                      type="file"
                      accept=".apk"
                      onChange={handleFileSelect}
                      disabled={uploadStorage.isPending}
                    />
                    {selectedFile && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <p className="font-medium text-blue-900">{selectedFile.name}</p>
                        <p className="text-blue-600">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedLeague && (
                  <Button onClick={handleUpload} disabled={uploadStorage.isPending || !selectedFile} className="w-full">
                    {uploadStorage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {uploadStorage.isPending ? 'Subiendo…' : 'Subir APK'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Releases List */}
            {selectedLeague && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Versiones Disponibles</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => releases.refetch()}
                    disabled={releases.isPending}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <QueryState
                    query={releases}
                    loadingLabel="Cargando versiones…"
                    isEmpty={(res) => res.data.length === 0}
                    empty={
                      <div className="text-center py-8">
                        <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No hay versiones disponibles para esta liga</p>
                      </div>
                    }
                  >
                    {(res) => (
                      <div className="border rounded-lg overflow-hidden">
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
                                <TableCell className="font-medium text-sm">{release.filename || release.key.split('/').pop()}</TableCell>
                                <TableCell className="text-sm">{formatFileSize(release.size)}</TableCell>
                                <TableCell className="text-sm">{formatDate(release.modified)}</TableCell>
                                <TableCell className="text-right space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownload(release)}
                                    disabled={getUrl.isPending}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteConfirm(release)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
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
            )}
          </>
        )}
      </QueryState>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar APK</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar "{deleteConfirm?.filename || deleteConfirm?.key}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteObject.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteObject.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
