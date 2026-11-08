import { AlertCircle, CheckCircle, Clock, Eye, Loader2, Pencil, RefreshCw, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QueryState } from '@/components/states'

import { useDeleteRecording, useRecordings, useRefreshRecording } from './api'
import { DeleteConfirm } from './delete-confirm'
import { EditVideoDialog } from './edit-video-dialog'
import type { Recording } from './types'
import { VideoUploadDialog } from './video-upload-dialog'

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400', icon: Clock },
  uploading: { label: 'Subiendo', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400', icon: Loader2 },
  processing: { label: 'Procesando', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400', icon: Loader2 },
  ready: { label: 'Listo', color: 'bg-green-500/20 text-green-700 dark:text-green-400', icon: CheckCircle },
  failed: { label: 'Error', color: 'bg-red-500/20 text-red-700 dark:text-red-400', icon: AlertCircle },
} as const

function RecordingRow({ recording, onEdit }: { recording: Recording; onEdit: (r: Recording) => void }) {
  const config = statusConfig[recording.status] ?? statusConfig.pending
  const Icon = config.icon
  const deleteRecording = useDeleteRecording()
  const refreshRecording = useRefreshRecording()

  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/50">
      <div className="flex-1 min-w-0">
        <Link to={`/play/watch/${recording.id}`} className="text-sm font-medium hover:text-primary hover:underline truncate block">
          {recording.title}
        </Link>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" aria-hidden="true" />
            {recording.views_count}
          </span>
          {recording.duration_seconds ? <span>{Math.floor(recording.duration_seconds / 60)} min</span> : null}
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
            aria-label={`Actualizar estado de ${recording.title}`}
            onClick={() => refreshRecording.mutate(recording.id)}
            disabled={refreshRecording.isPending}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </Button>
        )}
        <Button size="sm" variant="outline" aria-label={`Editar video ${recording.title}`} onClick={() => onEdit(recording)}>
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </Button>
        <DeleteConfirm
          label={`Eliminar video ${recording.title}`}
          title="¿Eliminar video?"
          description="Esta acción no se puede deshacer. El video será eliminado permanentemente."
          onConfirm={() => deleteRecording.mutate(recording.id)}
        />
      </div>
    </div>
  )
}

export function AdminVideos() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editing, setEditing] = useState<Recording | null>(null)
  const recordings = useRecordings({ limit: 50, offset: 0 })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Tus Videos</h2>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
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
                      <RecordingRow recording={recording} onEdit={setEditing} />
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

      <EditVideoDialog recording={editing} onClose={() => setEditing(null)} />
      <VideoUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  )
}
