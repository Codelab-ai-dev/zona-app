"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
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
import { Download, Upload, Trash2, Smartphone, Calendar, FileArchive, RefreshCw } from "lucide-react"

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

      const response = await fetch(`/api/storage/list?bucket=app-releases&prefix=${leagueId}`)
      const result = await response.json()

      if (!response.ok) {
        console.error('Error loading files:', result.error)
        toast.error('Error al cargar los archivos')
        return
      }

      // Map storage files to AppFile format
      const mappedFiles: AppFile[] = result.files.map((f: any) => ({
        name: f.name,
        id: f.etag || f.name,
        created_at: f.createdAt,
        metadata: {
          size: f.size,
          mimetype: f.contentType,
        }
      }))

      setFiles(mappedFiles)
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
      const fileId = `ZonaGol-${timestamp}`

      // Subir archivo via API (uses configured storage provider)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('bucket', 'app-releases')
      formData.append('fileId', fileId)
      formData.append('leagueId', selectedLeague)

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Upload error:', result.error)
        toast.error('Error al subir el archivo: ' + result.error)
        return
      }

      console.log('[AppManagement] APK uploaded successfully:', result.publicUrl)
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
      // Get public URL and download
      const response = await fetch(`/api/storage/url?bucket=app-releases&path=${selectedLeague}/${file.name}`)
      const result = await response.json()

      if (!response.ok) {
        toast.error('Error al obtener el archivo')
        return
      }

      // Open download URL
      const a = document.createElement('a')
      a.href = result.url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      toast.success('Descarga iniciada')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al descargar el archivo')
    }
  }

  const handleGetPublicLink = async (file: AppFile) => {
    try {
      const response = await fetch(`/api/storage/url?bucket=app-releases&path=${selectedLeague}/${file.name}`)
      const result = await response.json()

      if (response.ok && result.url) {
        await navigator.clipboard.writeText(result.url)
        toast.success('Enlace público copiado al portapapeles')
      } else {
        toast.error('Error al obtener el enlace')
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
      const response = await fetch(`/api/storage/delete?bucket=app-releases&path=${selectedLeague}/${file.name}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        console.error('Delete error:', result.error)
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 md:p-2.5 rounded-lg bg-green-500/20">
          <Smartphone className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white">Gestión de Aplicación Móvil</h2>
          <p className="text-gray-500 text-sm">Administra las versiones del APK de Zona-Gol</p>
        </div>
      </div>

      {/* Main Card */}
      <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4 md:p-6 space-y-5">
        {/* League Selector */}
        <div className="space-y-2">
          <Label htmlFor="league-select" className="text-gray-400 text-sm">Seleccionar Liga</Label>
          <Select value={selectedLeague} onValueChange={setSelectedLeague}>
            <SelectTrigger className="bg-slate-700/50 border-white/10 text-white">
              <SelectValue placeholder="Selecciona una liga" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              {leagues.map((league) => (
                <SelectItem key={league.id} value={league.id} className="text-white hover:bg-slate-800">
                  {league.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedLeague && (
          <>
            {/* Upload Section */}
            <div className="space-y-4 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <FileArchive className="w-3.5 h-3.5" />
                <span>Formatos permitidos: APK (máx. 150MB)</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apk-upload" className="text-gray-400 text-sm">Seleccionar APK</Label>
                <Input
                  id="apk-upload"
                  type="file"
                  accept=".apk"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="bg-slate-700/50 border-white/10 text-white file:text-gray-400 file:bg-slate-600/50 file:border-0 file:rounded file:px-2 file:py-1 file:mr-3"
                />
              </div>

              {selectedFile && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-medium text-white text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white border-0"
                    >
                      {uploading ? (
                        <>Subiendo...</>
                      ) : (
                        <>
                          <Upload className="mr-1.5 w-3.5 h-3.5" />
                          Subir APK
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Files List */}
            <div className="space-y-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm md:text-base font-semibold text-white">APKs Disponibles</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadFiles(selectedLeague)}
                  className="text-gray-400 hover:text-white hover:bg-slate-700/50 h-7 px-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Actualizar
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Cargando archivos...
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                    <Smartphone className="w-6 h-6 text-gray-500" />
                  </div>
                  <p className="text-gray-500 text-sm">No hay APKs disponibles para esta liga</p>
                  <p className="text-gray-600 text-xs mt-1">Sube el primer APK para comenzar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-lg bg-slate-700/30 border border-white/5 p-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-green-500/20 flex-shrink-0">
                            <Smartphone className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white text-sm truncate">{file.name}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                              <span className="flex items-center">
                                <FileArchive className="w-3 h-3 mr-1" />
                                {formatFileSize(file.metadata.size)}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(file.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(file)}
                            className="bg-slate-700/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700 h-7 px-2 text-xs"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Descargar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGetPublicLink(file)}
                            className="bg-slate-700/50 border-white/10 text-gray-400 hover:text-white hover:bg-slate-700 h-7 px-2 text-xs"
                          >
                            Copiar Link
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(file)}
                            className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 h-7 px-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
