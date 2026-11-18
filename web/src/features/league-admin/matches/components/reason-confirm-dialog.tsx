import { useId, useState, type ReactNode } from 'react'

import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MIN_REASON = 5

interface ReasonConfirmDialogProps {
  title: string
  /** What will happen, shown before the reason. */
  children: ReactNode
  /** Text of the "I understand" checkbox: the second confirmation. */
  acknowledge: string
  confirmLabel: string
  pending: boolean
  /** Receives the trimmed reason; the dialog stays open until it resolves. */
  onConfirm: (reason: string) => void
  onClose: () => void
}

/**
 * Confirmation for corrections that undo official data: the admin writes a
 * reason (kept in the audit log) and ticks an acknowledgement before the
 * action is enabled.
 */
export function ReasonConfirmDialog({ title, children, acknowledge, confirmLabel, pending, onConfirm, onClose }: ReasonConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const [understood, setUnderstood] = useState(false)
  const reasonId = useId()
  const ackId = useId()
  const trimmed = reason.trim()
  const ready = trimmed.length >= MIN_REASON && understood && !pending

  return (
    <AlertDialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent className="border-white/10 bg-slate-900 text-white">
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-2 text-sm text-gray-400">{children}</div>
        </AlertDialogDescription>
        <div className="space-y-2">
          <Label htmlFor={reasonId}>Motivo (queda registrado)</Label>
          <Textarea
            id={reasonId}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej.: el resultado se capturó en el partido equivocado"
            className="border-white/10 bg-slate-800/50"
          />
          {reason.length > 0 && trimmed.length < MIN_REASON && <p className="text-xs text-orange-400">Escribe al menos {MIN_REASON} caracteres.</p>}
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id={ackId} checked={understood} onCheckedChange={(v) => setUnderstood(v === true)} />
          <Label htmlFor={ackId} className="text-sm font-normal leading-snug text-gray-300">{acknowledge}</Label>
        </div>
        <div className="flex gap-3">
          <AlertDialogCancel disabled={pending} className="border-white/10 bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 hover:text-white">Volver</AlertDialogCancel>
          <Button onClick={() => onConfirm(trimmed)} disabled={!ready} className="bg-red-600 text-white hover:bg-red-700">
            {pending ? 'Guardando…' : confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
