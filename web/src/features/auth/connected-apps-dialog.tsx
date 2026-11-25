import { Bot, Loader2, PlugZap } from 'lucide-react'
import { useState, type ReactElement } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ApiError } from '@/lib/api/client'

import { useConnections, useDisconnect, type Connection } from './connections'

const dateFormat = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (iso: string) => dateFormat.format(new Date(iso))

/**
 * Header button + dialog listing the AI clients connected to the account
 * (issue #50, phase C). Disconnecting revokes the connection and its tokens
 * at once.
 */
export function ConnectedAppsDialog({ trigger }: { trigger?: ReactElement } = {}) {
  const [open, setOpen] = useState(false)
  const connections = useConnections(open)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <PlugZap className="size-4" aria-hidden="true" />
            Aplicaciones conectadas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-slate-800 bg-slate-950 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aplicaciones conectadas</DialogTitle>
          <DialogDescription className="text-slate-400">
            Asistentes de IA que pueden consultar los datos de tus ligas y equipos. Solo lectura.
          </DialogDescription>
        </DialogHeader>

        {connections.isPending ? (
          <p className="flex items-center gap-2 py-6 text-sm text-slate-400" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando…
          </p>
        ) : connections.isError ? (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            No se pudieron cargar las aplicaciones.
            <Button variant="outline" size="sm" onClick={() => void connections.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : connections.data.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center">
            <Bot className="mx-auto size-6 text-slate-500" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-white">No hay aplicaciones conectadas</p>
            <p className="mt-1 text-sm text-slate-400">Cuando autorices un asistente de IA, aparecerá aquí.</p>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Aplicaciones">
            {connections.data.data.map((c) => (
              <ConnectionRow key={c.id} connection={c} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ConnectionRow({ connection: c }: { connection: Connection }) {
  const disconnect = useDisconnect()
  const [confirming, setConfirming] = useState(false)

  const run = () =>
    disconnect.mutate(c.id, {
      onSuccess: () => toast.success(`${c.client_name} se desconectó.`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : 'No se pudo desconectar. Inténtalo de nuevo.'),
    })

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-semibold text-white">{c.client_name}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Conectada el {formatDate(c.created_at)}
            {c.last_used_at ? ` · último acceso ${formatDate(c.last_used_at)}` : ''}
          </p>
          {c.scopes.map((s) => (
            <p key={s.scope} className="mt-2 text-sm text-slate-300">
              {s.description}
            </p>
          ))}
        </div>
        {!confirming && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setConfirming(true)}>
            Desconectar
          </Button>
        )}
      </div>
      {confirming && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 pt-3">
          <p className="mr-auto text-sm text-slate-300">¿Desconectar {c.client_name}? Perderá el acceso de inmediato.</p>
          <Button variant="ghost" size="sm" disabled={disconnect.isPending} onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" size="sm" disabled={disconnect.isPending} onClick={run}>
            {disconnect.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Sí, desconectar
          </Button>
        </div>
      )}
    </li>
  )
}
