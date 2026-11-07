import { Trash2, RefreshCw, Upload, Eye, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { QueryState } from '@/components/states'

import { useRecordings, useDeleteRecording, useRefreshRecording } from './api'
import type { Recording } from './types'

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400', icon: Clock },
  uploading: { label: 'Subiendo', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400', icon: Loader2 },
  processing: { label: 'Procesando', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400', icon: Loader2 },
  ready: { label: 'Listo', color: 'bg-green-500/20 text-green-700 dark:text-green-400', icon: CheckCircle },
  failed: { label: 'Error', color: 'bg-red-500/20 text-red-700 dark:text-red-400', icon: AlertCircle },
} as const

function RecordingRow({ recording }: { recording: Recording }) {
  const configKey = (recording.status as keyof typeof statusConfig) in statusConfig ? (recording.status as keyof typeof statusConfig) : 'pending'
  const config = statusConfig[configKey]
  const Icon = config.icon

  const deleteRecording = useDeleteRecording()
  const refreshRecording = useRefreshRecording()

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50">
      <div className="flex-1 min-w-0">
        <Link to={`/play/watch/${recording.id}`} className="text-sm font-medium hover:text-primary hover:underline truncate block">
          {recording.title}
        </Link>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" aria-hidden="true" />
            {recording.views_count}
          </span>
          {recording.duration_seconds && (
            <span>
              {Math.floor(recording.duration_seconds / 60)} min
            </span>
          )}
          <span>{new Date(recording.created_at).toLocaleDateString('es-MX')}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <Badge className={config.color} variant="secondary">
          <Icon className="w-3 h-3 mr-1" aria-hidden="true" />
          {config.label}
        </Badge>

        {recording.status === 'processing' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => refreshRecording.mutate(recording.id)}
            disabled={refreshRecording.isPending}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar video?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción no se puede deshacer. El video será eliminado permanentemente.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteRecording.mutate(recording.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export function AdminPage() {
  const recordings = useRecordings({ limit: 50, offset: 0 })

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Zona Play Admin</h1>
        <p className="text-muted-foreground">Gestiona tus videos, clips y transmisiones</p>
      </header>

      <Tabs defaultValue="videos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="clips" disabled>
            Clips
          </TabsTrigger>
          <TabsTrigger value="streams" disabled>
            Transmisiones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Tus Videos</h2>
            <Button asChild className="gap-2">
              <Link to="/play/upload">
                <Upload className="w-4 h-4" aria-hidden="true" />
                Subir video
              </Link>
            </Button>
          </div>

          <QueryState query={recordings} loadingLabel="Cargando videos…">
            {(res) => (
              <Card>
                <CardContent className="p-0">
                  {res.data.length > 0 ? (
                    <ul className="divide-y">
                      {res.data.map((recording) => (
                        <li key={recording.id}>
                          <RecordingRow recording={recording} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">No hay videos aún. Sube tu primer video.</div>
                  )}
                </CardContent>
              </Card>
            )}
          </QueryState>
        </TabsContent>

        <TabsContent value="clips">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">Los clips aún no están disponibles.</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streams">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">Las transmisiones aún no están disponibles.</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
