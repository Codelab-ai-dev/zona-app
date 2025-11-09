"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Download, Upload, Trash2, Smartphone, Calendar, FileArchive } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AppFile {
  name: string
  id: string
  created_at: string
  metadata: {
    size: number
    mimetype: string
  }
}

interface AppManagementProps {
  leagueId: string
}

export function AppManagement({ leagueId }: AppManagementProps) {
  const [files, setFiles] = useState<AppFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const supabase = createClientSupabaseClient()

  useEffect(() => {
    loadFiles()
  }, [leagueId])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.storage
        .from('app-releases')
        .list(`${leagueId}/`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        console.error('Error loading files:', error)
        toast.error('Error al cargar los archivos')
        return
      }

      setFiles(data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar los archivos')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar que sea un APK
      if (!file.name.endsWith('.apk')) {
        toast.error('Solo se permiten archivos APK')
        return
      }
      // Validar tamaño (máximo 150MB)
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

    setUploading(true)
    try {
      // Generar nombre único con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `ZonaGol-${timestamp}.apk`
      const filePath = `${leagueId}/${fileName}`

      // Subir archivo
      const { error: uploadError } = await supabase.storage
        .from('app-releases')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        toast.error('Error al subir el archivo: ' + uploadError.message)
        return
      }

      toast.success('APK subido exitosamente')
      setSelectedFile(null)
      // Reset input
      const input = document.getElementById('apk-upload') as HTMLInputElement
      if (input) input.value = ''

      // Recargar lista
      await loadFiles()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (file: AppFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('app-releases')
        .download(`${leagueId}/${file.name}`)

      if (error) {
        console.error('Download error:', error)
        toast.error('Error al descargar el archivo')
        return
      }

      // Crear URL y descargar
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Descarga iniciada')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al descargar el archivo')
    }
  }

  const handleGetPublicLink = async (file: AppFile) => {
    try {
      const { data } = await supabase.storage
        .from('app-releases')
        .getPublicUrl(`${leagueId}/${file.name}`)

      if (data.publicUrl) {
        await navigator.clipboard.writeText(data.publicUrl)
        toast.success('Enlace público copiado al portapapeles')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al obtener el enlace')
    }
  }

  const handleDelete = async (file: AppFile) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este APK?')) {
      return
    }

    try {
      const { error } = await supabase.storage
        .from('app-releases')
        .remove([`${leagueId}/${file.name}`])

      if (error) {
        console.error('Delete error:', error)
        toast.error('Error al eliminar el archivo')
        return
      }

      toast.success('APK eliminado exitosamente')
      await loadFiles()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar el archivo')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Smartphone className="h-6 w-6 text-green-400" />
            <div>
              <CardTitle className="text-white drop-shadow-lg">Gestión de Aplicación Móvil</CardTitle>
              <CardDescription className="text-white/80 drop-shadow">
                Sube y administra las versiones del APK de Zona-Gol para tu liga
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-white/80 drop-shadow">
              <FileArchive className="h-4 w-4" />
              <span>Formatos permitidos: APK (máx. 150MB)</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apk-upload" className="text-white drop-shadow">Seleccionar APK</Label>
              <Input
                id="apk-upload"
                type="file"
                accept=".apk"
                onChange={handleFileSelect}
                disabled={uploading}
                className="backdrop-blur-md bg-white/10 border-white/30 text-white file:text-white rounded-xl"
              />
            </div>

            {selectedFile && (
              <Alert className="backdrop-blur-xl bg-blue-500/20 border-blue-300/30 shadow-xl">
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white drop-shadow">{selectedFile.name}</p>
                      <p className="text-sm text-white/70 drop-shadow">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      size="sm"
                      className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg rounded-xl"
                    >
                      {uploading ? (
                        <>Subiendo...</>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Subir APK
                        </>
                      )}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Files List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white drop-shadow-lg">APKs Disponibles</h3>
              <Button variant="ghost" size="sm" onClick={loadFiles} className="text-white hover:bg-white/10">
                Actualizar
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-white/80 drop-shadow">
                Cargando archivos...
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-white/80 drop-shadow">
                <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50 text-white" />
                <p>No hay APKs disponibles</p>
                <p className="text-sm mt-2">Sube el primer APK para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <Card key={file.id} className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="backdrop-blur-md bg-green-500/20 p-2 rounded-xl border border-green-300/30">
                            <Smartphone className="h-6 w-6 text-green-300" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white drop-shadow">{file.name}</h4>
                            <div className="flex items-center space-x-4 text-sm text-white/70 drop-shadow mt-1">
                              <span className="flex items-center">
                                <FileArchive className="h-3 w-3 mr-1" />
                                {formatFileSize(file.metadata.size)}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(file.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(file)}
                            className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Descargar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGetPublicLink(file)}
                            className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
                          >
                            Copiar Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(file)}
                            className="backdrop-blur-md bg-red-500/30 border-red-300/50 text-red-300 hover:bg-red-500/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <Alert className="backdrop-blur-xl bg-blue-500/20 border-blue-300/30 shadow-xl">
            <AlertDescription className="text-white/90 drop-shadow">
              <h4 className="font-medium mb-2 text-white">📱 Instrucciones para usuarios:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Descarga el APK más reciente desde esta sección</li>
                <li>En tu dispositivo Android, ve a Configuración → Seguridad</li>
                <li>Habilita "Instalar desde fuentes desconocidas"</li>
                <li>Abre el archivo APK descargado</li>
                <li>Sigue las instrucciones de instalación</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
