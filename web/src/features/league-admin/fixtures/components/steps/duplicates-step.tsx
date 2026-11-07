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
    <div className="space-y-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-5 flex-shrink-0 text-warning" aria-hidden="true" />
        <div className="space-y-2">
          <h3 className="font-medium">Partidos duplicados encontrados</h3>
          <p className="text-sm text-muted-foreground">
            Se encontraron {count} grupos de partidos duplicados en este torneo. Puedes generar de todas formas.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} size="sm" disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={pending} size="sm">
              {pending ? 'Generando…' : 'Generar de todas formas'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
