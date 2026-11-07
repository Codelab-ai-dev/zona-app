import { Trash2, RefreshCw, Upload, Eye, Clock, CheckCircle, AlertCircle, Loader2, Copy, Eye as EyeIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

import { useRecordings, useDeleteRecording, useRefreshRecording, useClips, useDeleteClip, useCreateClip, useStreams, useCreateStream, useDeleteStream } from './api'
import { VideoUploadDialog } from './video-upload-dialog'
import type { Recording, Clip, ClipType, Stream } from './types'

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

const clipTypes: ClipType[] = ['goal', 'save', 'yellow_card', 'red_card', 'penalty', 'highlight', 'custom', 'ai_generated']

const clipTypeLabels: Record<ClipType, string> = {
  goal: 'Gol',
  save: 'Atajada',
  highlight: 'Highlight',
  yellow_card: 'Tarjeta amarilla',
  red_card: 'Tarjeta roja',
  penalty: 'Penal',
  custom: 'Personalizado',
  ai_generated: 'IA generado',
}

function ClipRow({ clip }: { clip: Clip }) {
  const deleteClip = useDeleteClip()

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{clip.title}</div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <span>{Math.floor(clip.duration_seconds)}s</span>
          <span>{clip.clip_type ? clipTypeLabels[clip.clip_type as ClipType] : 'Personalizado'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar clip?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteClip.mutate(clip.id)}
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

function StreamRow({ stream }: { stream: Stream }) {
  const deleteStream = useDeleteStream()
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{stream.title}</div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <span className="capitalize">{stream.status}</span>
          {stream.current_viewers !== undefined && (
            <span className="flex items-center gap-1">
              <EyeIcon className="w-3 h-3" aria-hidden="true" />
              {stream.current_viewers}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        {/* Stream key button */}
        {stream.mux_stream_key && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowKey(!showKey)}
            title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
          >
            {showKey ? <EyeIcon className="w-4 h-4" aria-hidden="true" /> : <EyeIcon className="w-4 h-4" aria-hidden="true" />}
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
              <AlertDialogTitle>¿Eliminar transmisión?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteStream.mutate(stream.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {showKey && stream.mux_stream_key && (
        <div className="col-span-full mt-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
          <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2">⚠️ Clave secreta - No compartas con nadie</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-background p-2 rounded flex-1 break-all font-mono">{stream.mux_stream_key}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(stream.mux_stream_key!)
                toast.success('Clave copiada')
              }}
              title="Copiar clave"
            >
              <Copy className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [showCreateClip, setShowCreateClip] = useState(false)
  const [clipForm, setClipForm] = useState({ title: '', recordingId: '', startSeconds: 0, endSeconds: 0, clipType: 'highlight' as ClipType })
  const [showCreateStream, setShowCreateStream] = useState(false)
  const [streamForm, setStreamForm] = useState({ title: '', description: '', sourceType: 'obs' })

  const recordings = useRecordings({ limit: 50, offset: 0 })
  const clips = useClips({ limit: 50, offset: 0 })
  const streams = useStreams({ limit: 50, offset: 0 })

  const createClip = useCreateClip()
  const createStream = useCreateStream()

  const handleCreateClip = () => {
    if (!clipForm.title || !clipForm.recordingId) {
      toast.error('Completa los campos requeridos')
      return
    }
    createClip.mutate({
      title: clipForm.title,
      recording_id: clipForm.recordingId,
      start_time_seconds: clipForm.startSeconds,
      end_time_seconds: clipForm.endSeconds,
      clip_type: clipForm.clipType,
    })
    setClipForm({ title: '', recordingId: '', startSeconds: 0, endSeconds: 0, clipType: 'highlight' })
    setShowCreateClip(false)
  }

  const handleCreateStream = () => {
    if (!streamForm.title) {
      toast.error('Escribe un título')
      return
    }
    createStream.mutate({
      title: streamForm.title,
      description: streamForm.description || undefined,
      source_type: streamForm.sourceType,
    })
    setStreamForm({ title: '', description: '', sourceType: 'obs' })
    setShowCreateStream(false)
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Zona Play Admin</h1>
        <p className="text-muted-foreground">Gestiona tus videos, clips y transmisiones</p>
      </header>

      <Tabs defaultValue="videos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="clips">Clips</TabsTrigger>
          <TabsTrigger value="streams">Transmisiones</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Tus Videos</h2>
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" aria-hidden="true" />
              Subir video
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

        <TabsContent value="clips" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Tus Clips</h2>
            <Button onClick={() => setShowCreateClip(!showCreateClip)} className="gap-2">
              <Upload className="w-4 h-4" aria-hidden="true" />
              Crear clip
            </Button>
          </div>

          {showCreateClip && (
            <Card className="border-primary/50">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clip-title">Título *</Label>
                  <Input
                    id="clip-title"
                    value={clipForm.title}
                    onChange={(e) => setClipForm({ ...clipForm, title: e.target.value })}
                    placeholder="Ej: Golazo de media cancha"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clip-recording">Video *</Label>
                  <Select value={clipForm.recordingId} onValueChange={(val) => setClipForm({ ...clipForm, recordingId: val })}>
                    <SelectTrigger id="clip-recording">
                      <SelectValue placeholder="Selecciona un video" />
                    </SelectTrigger>
                    <SelectContent>
                      {recordings.data?.data.map((rec) => (
                        <SelectItem key={rec.id} value={rec.id}>
                          {rec.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clip-start">Inicio (segundos)</Label>
                    <Input
                      id="clip-start"
                      type="number"
                      value={clipForm.startSeconds}
                      onChange={(e) => setClipForm({ ...clipForm, startSeconds: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clip-end">Fin (segundos)</Label>
                    <Input
                      id="clip-end"
                      type="number"
                      value={clipForm.endSeconds}
                      onChange={(e) => setClipForm({ ...clipForm, endSeconds: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clip-type">Tipo</Label>
                  <Select value={clipForm.clipType} onValueChange={(val) => setClipForm({ ...clipForm, clipType: val as ClipType })}>
                    <SelectTrigger id="clip-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clipTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {clipTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateClip} disabled={createClip.isPending} className="flex-1">
                    {createClip.isPending ? 'Creando...' : 'Crear'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateClip(false)} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <QueryState query={clips} loadingLabel="Cargando clips…">
            {(res) => (
              <Card>
                <CardContent className="p-0">
                  {res.data.length > 0 ? (
                    <ul className="divide-y">
                      {res.data.map((clip) => (
                        <li key={clip.id}>
                          <ClipRow clip={clip} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">No hay clips aún. Crea tu primer clip.</div>
                  )}
                </CardContent>
              </Card>
            )}
          </QueryState>
        </TabsContent>

        <TabsContent value="streams" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Tus Transmisiones</h2>
            <Button onClick={() => setShowCreateStream(!showCreateStream)} className="gap-2">
              <Upload className="w-4 h-4" aria-hidden="true" />
              Crear transmisión
            </Button>
          </div>

          {showCreateStream && (
            <Card className="border-primary/50">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stream-title">Título *</Label>
                  <Input
                    id="stream-title"
                    value={streamForm.title}
                    onChange={(e) => setStreamForm({ ...streamForm, title: e.target.value })}
                    placeholder="Ej: Liga Premier - Jornada 15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stream-description">Descripción (opcional)</Label>
                  <Input
                    id="stream-description"
                    value={streamForm.description}
                    onChange={(e) => setStreamForm({ ...streamForm, description: e.target.value })}
                    placeholder="Describe la transmisión..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stream-source">Fuente</Label>
                  <Select value={streamForm.sourceType} onValueChange={(val) => setStreamForm({ ...streamForm, sourceType: val })}>
                    <SelectTrigger id="stream-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="obs">OBS Studio</SelectItem>
                      <SelectItem value="xbotgo">xBotGo</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="web">Web</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateStream} disabled={createStream.isPending} className="flex-1">
                    {createStream.isPending ? 'Creando...' : 'Crear'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateStream(false)} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <QueryState query={streams} loadingLabel="Cargando transmisiones…">
            {(res) => (
              <Card>
                <CardContent className="p-0">
                  {res.data.length > 0 ? (
                    <ul className="divide-y">
                      {res.data.map((stream) => (
                        <li key={stream.id}>
                          <StreamRow stream={stream} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">No hay transmisiones aún.</div>
                  )}
                </CardContent>
              </Card>
            )}
          </QueryState>
        </TabsContent>
      </Tabs>

      <VideoUploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
    </section>
  )
}
