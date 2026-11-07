import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileArchive, Smartphone, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminLeagues, useUploadStorage } from '../api'
import { QueryState } from '@/components/states'

export function AppManagement() {
  const leagues = useAdminLeagues({ limit: 100 })
  const uploadStorage = useUploadStorage()
  const [selectedLeague, setSelectedLeague] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

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
      formData.append('path', selectedLeague)

      await uploadStorage.mutateAsync(formData)
      toast.success('APK subido exitosamente')
      setSelectedFile(null)
      const input = document.getElementById('apk-upload') as HTMLInputElement
      if (input) input.value = ''
    } catch {
      toast.error('Error al subir el archivo')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Gestión de Aplicación Móvil
        </h2>
        <p className="text-sm text-muted-foreground">Administra las versiones del APK</p>
      </div>

      <QueryState query={leagues} loadingLabel="Cargando ligas…" isEmpty={(res) => res.data.length === 0}>
        {(res) => (
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

              <Button onClick={handleUpload} disabled={uploadStorage.isPending || !selectedFile} className="w-full">
                {uploadStorage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploadStorage.isPending ? 'Subiendo…' : 'Subir APK'}
              </Button>
            </CardContent>
          </Card>
        )}
      </QueryState>
    </div>
  )
}
