import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface DuplicatesStepProps {
  count: number
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Shown before generating when the tournament already has duplicated matches. */
export function DuplicatesStep({ count, pending, onCancel, onConfirm }: DuplicatesStepProps) {
  return (
    <div className="space-y-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-5 flex-shrink-0 text-yellow-400" aria-hidden="true" />
        <div className="space-y-2">
          <h3 className="font-medium text-yellow-300">Partidos duplicados encontrados</h3>
          <p className="text-sm text-gray-500">
            Se encontraron {count} grupos de partidos duplicados en este torneo. Puedes generar de todas formas.
          </p>
          <div className="flex gap-2 pt-2">
            <Button className="border-white/10 bg-slate-700/50 text-gray-400 hover:bg-slate-700 hover:text-white" onClick={onCancel} size="sm" disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={pending} size="sm" className="bg-green-500 text-white hover:bg-green-600">
              {pending ? 'Generando…' : 'Generar de todas formas'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
