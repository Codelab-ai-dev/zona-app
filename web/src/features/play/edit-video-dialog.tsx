import { AlertCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import { useUpdateRecording } from './api'
import type { Recording, Visibility } from './types'

const visibilityOptions: { value: Visibility; label: string }[] = [
  { value: 'public', label: 'Público' },
  { value: 'unlisted', label: 'No listado' },
  { value: 'private', label: 'Privado' },
]

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

function EditForm({ recording, onClose }: { recording: Recording; onClose: () => void }) {
  const update = useUpdateRecording()
  const [title, setTitle] = useState(recording.title)
  const [description, setDescription] = useState(recording.description ?? '')
  const [homeScore, setHomeScore] = useState(recording.home_score?.toString() ?? '')
  const [awayScore, setAwayScore] = useState(recording.away_score?.toString() ?? '')
  const [visibility, setVisibility] = useState<Visibility>(recording.visibility)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const options =
    visibilityOptions.some((o) => o.value === visibility) ? visibilityOptions : [...visibilityOptions, { value: visibility, label: 'Premium' }]

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFields({})
    setFormError(null)
    try {
      await update.mutateAsync({
        id: recording.id,
        title,
        description,
        visibility,
        ...(homeScore !== '' ? { home_score: Number(homeScore) } : {}),
        ...(awayScore !== '' ? { away_score: Number(awayScore) } : {}),
      })
      onClose()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) setFields(err.fields)
      else setFormError(err instanceof Error ? err.message : 'No se pudo guardar el video')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="edit-title">Título *</Label>
        <Input
          id="edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={!!fields.title}
          aria-describedby={fields.title ? 'edit-title-error' : undefined}
        />
        <FieldError id="edit-title-error" message={fields.title} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-description">Descripción</Label>
        <Textarea
          id="edit-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={!!fields.description}
          aria-describedby={fields.description ? 'edit-description-error' : undefined}
        />
        <FieldError id="edit-description-error" message={fields.description} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-home">Goles local</Label>
          <Input id="edit-home" type="number" min={0} inputMode="numeric" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-away">Goles visitante</Label>
          <Input id="edit-away" type="number" min={0} inputMode="numeric" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-visibility">Visibilidad</Label>
        <Select value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
          <SelectTrigger id="edit-visibility" aria-invalid={!!fields.visibility}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id="edit-visibility-error" message={fields.visibility} />
        <p className="text-xs text-muted-foreground">
          Público aparece en Zona Play; No listado solo se ve con el enlace; Privado solo lo ven los administradores de la liga.
        </p>
      </div>
      {formError && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 flex-shrink-0" aria-hidden="true" />
          <p role="alert">{formError}</p>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={update.isPending || title.trim() === ''}>
          {update.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function EditVideoDialog({ recording, onClose }: { recording: Recording | null; onClose: () => void }) {
  return (
    <Dialog open={recording !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar video</DialogTitle>
          <DialogDescription>Cambia los datos que se muestran en Zona Play.</DialogDescription>
        </DialogHeader>
        {recording && <EditForm key={recording.id} recording={recording} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
