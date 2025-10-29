"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

interface League {
  id: string
  name: string
  slug: string
}

export function AppManagementSuperAdmin() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState<string>("")
  const [files, setFiles] = useState<AppFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const supabase = createClientSupabaseClient()

  useEffect(() => {
    loadLeagues()
  }, [])

  useEffect(() => {
    if (selectedLeague) {
      loadFiles(selectedLeague)
    }
  }, [selectedLeague])

  const loadLeagues = async () => {
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error loading leagues:', error)
        toast.error('Error al cargar las ligas')
        return
      }

      setLeagues(data || [])
      if (data && data.length > 0) {
        setSelectedLeague(data[0].id)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar las ligas')
    }
  }

  const loadFiles = async (leagueId: string) => {
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

    if (!selectedLeague) {
      toast.error('Por favor selecciona una liga')
      return
    }

    setUploading(true)
    try {
      // Generar nombre único con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `ZonaGol-${timestamp}.apk`
      const filePath = `${selectedLeague}/${fileName}`

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
      await loadFiles(selectedLeague)
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
        .download(`${selectedLeague}/${file.name}`)

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
        .getPublicUrl(`${selectedLeague}/${file.name}`)

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
        .remove([`${selectedLeague}/${file.name}`])

      if (error) {
        console.error('Delete error:', error)
        toast.error('Error al eliminar el archivo')
        return
      }

      toast.success('APK eliminado exitosamente')
      await loadFiles(selectedLeague)
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
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Smartphone className="h-6 w-6 text-soccer-green" />
            <div>
              <CardTitle>Gestión Global de Aplicación Móvil</CardTitle>
              <CardDescription>
                Administra las versiones del APK de Zona-Gol para todas las ligas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* League Selector */}
          <div className="space-y-2">
            <Label htmlFor="league-select">Seleccionar Liga</Label>
            <Select value={selectedLeague} onValueChange={setSelectedLeague}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una liga" />
              </SelectTrigger>
              <SelectContent>
                {leagues.map((league) => (
                  <SelectItem key={league.id} value={league.id}>
                    {league.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Section */}
          {selectedLeague && (
            <>
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <FileArchive className="h-4 w-4" />
                  <span>Formatos permitidos: APK (máx. 150MB)</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apk-upload">Seleccionar APK</Label>
                  <Input
                    id="apk-upload"
                    type="file"
                    accept=".apk"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                </div>

                {selectedFile && (
                  <Alert>
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                        <Button
                          onClick={handleUpload}
                          disabled={uploading}
                          size="sm"
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
                  <h3 className="text-lg font-semibold">APKs Disponibles</h3>
                  <Button variant="ghost" size="sm" onClick={() => loadFiles(selectedLeague)}>
                    Actualizar
                  </Button>
                </div>

                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando archivos...
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay APKs disponibles para esta liga</p>
                    <p className="text-sm mt-2">Sube el primer APK para comenzar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {files.map((file) => (
                      <Card key={file.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div className="bg-soccer-green/10 p-2 rounded">
                                <Smartphone className="h-6 w-6 text-soccer-green" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{file.name}</h4>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
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
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Descargar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGetPublicLink(file)}
                              >
                                Copiar Link
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(file)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
