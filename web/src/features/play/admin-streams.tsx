import { Copy, Eye, EyeOff, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QueryState } from '@/components/states'
import { ApiError } from '@/lib/api/client'

import { useCreateStream, useDeleteStream, useStreams } from './api'
import { DeleteConfirm } from './delete-confirm'
import type { Stream } from './types'

function StreamRow({ stream }: { stream: Stream }) {
  const deleteStream = useDeleteStream()
  const [showKey, setShowKey] = useState(false)
  const key = stream.mux_stream_key

  const copyKey = async () => {
    if (!key) return
    try {
      await navigator.clipboard.writeText(key)
      toast.success('Clave copiada')
    } catch {
      toast.error('No se pudo copiar la clave')
    }
  }

  return (
    <div className="p-4 hover:bg-muted/50">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{stream.title}</div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span className="capitalize">{stream.status}</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" aria-hidden="true" />
              {stream.current_viewers}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {key && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowKey(!showKey)}
              aria-label={showKey ? 'Ocultar clave' : 'Mostrar clave'}
              aria-pressed={showKey}
            >
              {showKey ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </Button>
          )}
          <DeleteConfirm
            label={`Eliminar transmisión ${stream.title}`}
            title="¿Eliminar transmisión?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => deleteStream.mutate(stream.id)}
          />
        </div>
      </div>

      {showKey && key && (
        <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
          <p className="text-xs font-medium text-destructive mb-2">Clave secreta: no la compartas con nadie</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-background p-2 rounded flex-1 break-all font-mono">{key}</code>
            <Button size="sm" variant="outline" onClick={copyKey} aria-label="Copiar clave">
              <Copy className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StreamForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sourceType, setSourceType] = useState('obs')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const createStream = useCreateStream()

  const submit = () => {
    if (!title) {
      setFieldErrors({ title: 'Escribe un título' })
      return
    }
    setFieldErrors({})
    createStream.mutate(
      { title, description: description || undefined, source_type: sourceType },
      {
        onSuccess: onDone,
        onError: (err) => {
          if (err instanceof ApiError && Object.keys(err.fields).length > 0) setFieldErrors(err.fields)
        },
      },
    )
  }

  return (
    <Card className="border-primary/50">
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="stream-title">Título *</Label>
          <Input
            id="stream-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Liga Premier - Jornada 15"
            aria-invalid={fieldErrors.title ? true : undefined}
            aria-describedby={fieldErrors.title ? 'stream-title-error' : undefined}
          />
          {fieldErrors.title && (
            <p id="stream-title-error" className="text-sm text-destructive">
              {fieldErrors.title}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="stream-description">Descripción (opcional)</Label>
          <Input id="stream-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe la transmisión..." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stream-source">Fuente</Label>
          <Select value={sourceType} onValueChange={setSourceType}>
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
          <Button onClick={submit} disabled={createStream.isPending} className="flex-1">
            {createStream.isPending ? 'Creando…' : 'Crear'}
          </Button>
          <Button variant="outline" onClick={onDone} className="flex-1">
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminStreams() {
  const [showForm, setShowForm] = useState(false)
  const streams = useStreams({ limit: 50, offset: 0 })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Tus Transmisiones</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Crear transmisión
        </Button>
      </div>

      {showForm && <StreamForm onDone={() => setShowForm(false)} />}

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
    </div>
  )
}
