"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Download, Smartphone, Calendar, FileArchive, ExternalLink } from "lucide-react"
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

interface AppDownloadProps {
  leagueId: string
}

export function AppDownload({ leagueId }: AppDownloadProps) {
  const [files, setFiles] = useState<AppFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFiles()
  }, [leagueId])

  const loadFiles = async () => {
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

  const handleDownload = async (file: AppFile) => {
    try {
      // Get public URL and download
      const response = await fetch(`/api/storage/url?bucket=app-releases&path=${leagueId}/${file.name}`)
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
      const response = await fetch(`/api/storage/url?bucket=app-releases&path=${leagueId}/${file.name}`)
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

  if (loading) {
    return (
      <div className="text-center py-8 text-white/80 drop-shadow">
        Cargando archivos...
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-white/80 drop-shadow">
        <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50 text-white" />
        <p>No hay APKs disponibles</p>
        <p className="text-sm mt-2">Contacta al administrador para que suba la aplicación</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Latest version highlight */}
      <Alert className="backdrop-blur-md bg-green-500/20 border-green-300/30 shadow-lg">
        <Smartphone className="h-4 w-4 text-green-300" />
        <AlertDescription className="text-white/90 drop-shadow">
          <strong className="text-white">Versión más reciente:</strong> {files[0]?.name}
        </AlertDescription>
      </Alert>

      {/* Files list */}
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        {files.map((file, index) => (
          <Card key={file.id} className={index === 0 ? "backdrop-blur-xl bg-white/10 border-green-300/30 shadow-xl" : "backdrop-blur-xl bg-white/10 border-white/20 shadow-xl"}>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="backdrop-blur-md bg-green-500/20 p-2 rounded-xl border border-green-300/30 flex-shrink-0">
                    <Smartphone className="h-5 w-5 text-green-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm break-words text-white drop-shadow">{file.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70 drop-shadow mt-1">
                      <span className="flex items-center whitespace-nowrap">
                        <FileArchive className="h-3 w-3 mr-1" />
                        {formatFileSize(file.metadata.size)}
                      </span>
                      <span className="flex items-center whitespace-nowrap">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(file.created_at)}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 backdrop-blur-md bg-green-500/80 text-white rounded-full text-xs font-medium whitespace-nowrap border-0 shadow-lg">
                          Última versión
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleDownload(file)}
                    className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg rounded-xl w-full lg:w-auto"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Descargar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGetPublicLink(file)}
                    className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20 w-full lg:w-auto"
                  >
                    <ExternalLink className="h-4 w-4 mr-1 lg:mr-0" />
                    <span className="lg:hidden">Copiar link</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Alert className="backdrop-blur-xl bg-blue-500/20 border-blue-300/30 shadow-xl">
        <AlertDescription className="text-white/90 drop-shadow">
          <h4 className="font-medium mb-2 text-white">📱 Instrucciones de instalación:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Descarga el APK más reciente</li>
            <li>En tu dispositivo Android, ve a Configuración → Seguridad</li>
            <li>Habilita "Instalar desde fuentes desconocidas"</li>
            <li>Abre el archivo APK descargado</li>
            <li>Sigue las instrucciones de instalación</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  )
}
