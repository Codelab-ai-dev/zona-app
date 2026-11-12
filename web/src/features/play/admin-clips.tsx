import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QueryState } from '@/components/states'
import { ApiError } from '@/lib/api/client'

import { useClips, useCreateClip, useDeleteClip, useRecordings } from './api'
import { DeleteConfirm } from './delete-confirm'
import type { Clip, ClipType } from './types'

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
    <div className="flex items-center justify-between p-4 hover:bg-muted/50">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{clip.title}</div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <span>{Math.floor(clip.duration_seconds)}s</span>
          <span>{clip.clip_type ? clipTypeLabels[clip.clip_type] : 'Personalizado'}</span>
        </div>
      </div>
      <div className="ml-4 flex-shrink-0">
        <DeleteConfirm
          label={`Eliminar clip ${clip.title}`}
          title="¿Eliminar clip?"
          description="Esta acción no se puede deshacer."
          onConfirm={() => deleteClip.mutate(clip.id)}
        />
      </div>
    </div>
  )
}

const emptyForm = { title: '', recordingId: '', start: '0', end: '0', clipType: 'highlight' as ClipType }

function ClipForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const recordings = useRecordings({ limit: 50, offset: 0 })
  const createClip = useCreateClip()

  const submit = () => {
    if (!form.title || !form.recordingId) {
      setFieldErrors({
        ...(form.title ? {} : { title: 'Escribe un título' }),
        ...(form.recordingId ? {} : { recording_id: 'Elige el video del clip' }),
      })
      return
    }
    setFieldErrors({})
    createClip.mutate(
      {
        title: form.title,
        recording_id: form.recordingId,
        start_time_seconds: Number(form.start) || 0,
        end_time_seconds: Number(form.end) || 0,
        clip_type: form.clipType,
      },
      {
        onSuccess: onDone,
        onError: (err) => {
          if (err instanceof ApiError && Object.keys(err.fields).length > 0) setFieldErrors(err.fields)
        },
      },
    )
  }

  const invalid = (name: string) => (fieldErrors[name] ? { 'aria-invalid': true, 'aria-describedby': `clip-${name}-error` } : {})
  const error = (name: string) =>
    fieldErrors[name] ? (
      <p id={`clip-${name}-error`} className="text-sm text-destructive">
        {fieldErrors[name]}
      </p>
    ) : null

  return (
    <Card className="border-primary/50">
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="clip-title">Título *</Label>
          <Input id="clip-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Golazo de media cancha" {...invalid('title')} />
          {error('title')}
        </div>

        <div className="space-y-2">
          <Label htmlFor="clip-recording">Video *</Label>
          <Select value={form.recordingId} onValueChange={(val) => setForm({ ...form, recordingId: val })}>
            <SelectTrigger id="clip-recording" {...invalid('recording_id')}>
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
          {error('recording_id')}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clip-start">Inicio (segundos)</Label>
            <Input id="clip-start" type="number" min={0} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} {...invalid('start_time_seconds')} />
            {error('start_time_seconds')}
          </div>
          <div className="space-y-2">
            <Label htmlFor="clip-end">Fin (segundos)</Label>
            <Input id="clip-end" type="number" min={0} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} {...invalid('end_time_seconds')} />
            {error('end_time_seconds')}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clip-type">Tipo</Label>
          <Select value={form.clipType} onValueChange={(val) => setForm({ ...form, clipType: val as ClipType })}>
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
          <Button onClick={submit} disabled={createClip.isPending} className="flex-1">
            {createClip.isPending ? 'Creando…' : 'Crear'}
          </Button>
          <Button variant="outline" onClick={onDone} className="flex-1">
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminClips() {
  const [showForm, setShowForm] = useState(false)
  const clips = useClips({ limit: 50, offset: 0 })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Tus Clips</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Crear clip
        </Button>
      </div>

      {showForm && <ClipForm onDone={() => setShowForm(false)} />}

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
    </div>
  )
}
