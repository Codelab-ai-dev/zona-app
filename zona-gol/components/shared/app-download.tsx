"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
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
      <div className="text-center py-8 text-muted-foreground">
        Cargando archivos...
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No hay APKs disponibles</p>
        <p className="text-sm mt-2">Contacta al administrador para que suba la aplicación</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Latest version highlight */}
      <Alert className="bg-soccer-green/10 border-soccer-green">
        <Smartphone className="h-4 w-4 text-soccer-green" />
        <AlertDescription>
          <strong>Versión más reciente:</strong> {files[0]?.name}
        </AlertDescription>
      </Alert>

      {/* Files list */}
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        {files.map((file, index) => (
          <Card key={file.id} className={index === 0 ? "border-soccer-green" : ""}>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="bg-soccer-green/10 p-2 rounded flex-shrink-0">
                    <Smartphone className="h-5 w-5 text-soccer-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm break-words">{file.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center whitespace-nowrap">
                        <FileArchive className="h-3 w-3 mr-1" />
                        {formatFileSize(file.metadata.size)}
                      </span>
                      <span className="flex items-center whitespace-nowrap">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(file.created_at)}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 bg-soccer-green text-white rounded-full text-xs font-medium whitespace-nowrap">
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
                    className="bg-soccer-green hover:bg-soccer-green-dark w-full lg:w-auto"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Descargar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGetPublicLink(file)}
                    className="w-full lg:w-auto"
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
      <Alert>
        <AlertDescription>
          <h4 className="font-medium mb-2">📱 Instrucciones de instalación:</h4>
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
