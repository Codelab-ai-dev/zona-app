import { CheckCircle, Loader2, Upload, X } from 'lucide-react'
import type { ChangeEvent, RefObject } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

export function UploadingPanel({ progress, onCancel }: { progress: number; onCancel: () => void }) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        <span>Subiendo video...</span>
      </div>
      <Progress value={progress} className="w-full" aria-label="Progreso de la subida" />
      <p className="text-center text-sm text-muted-foreground">{progress}% completado</p>
      <Button variant="outline" onClick={onCancel} className="w-full">
        <X className="w-4 h-4 mr-2" aria-hidden="true" />
        Cancelar
      </Button>
    </div>
  )
}

export function ProcessingPanel({ recordingId, onClose }: { recordingId?: string; onClose: () => void }) {
  return (
    <div className="space-y-4 py-8 text-center">
      <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" aria-hidden="true" />
      <div>
        <p className="font-medium">Procesando video</p>
        <p className="text-sm text-muted-foreground">Esto puede tomar unos minutos. Puedes cerrar esta ventana.</p>
      </div>
      {recordingId && (
        <Link to={`/play/watch/${recordingId}`} className="text-sm text-primary hover:underline">
          Ver video
        </Link>
      )}
      <Button variant="outline" onClick={onClose} className="w-full">
        Cerrar
      </Button>
    </div>
  )
}

export function FileField({
  inputRef,
  file,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  file: File | null
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="video">Video *</Label>
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
        <input ref={inputRef} id="video" type="file" accept="video/*" onChange={onChange} className="hidden" />
        <label htmlFor="video" className="cursor-pointer block">
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
              <span className="text-sm">{file.name}</span>
              <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Click para seleccionar video</p>
              <p className="text-xs text-muted-foreground">MP4, MOV, MKV • Máx 5GB</p>
            </div>
          )}
        </label>
      </div>
    </div>
  )
}
