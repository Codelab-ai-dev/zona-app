import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

interface ReasonDialogProps {
  title: string
  description: string
  confirmLabel: string
  pendingLabel: string
  isPending: boolean
  /** Receives the trimmed reason; rejects when the API refuses. */
  onConfirm: (reason: string) => Promise<unknown>
  onClose: () => void
}

/** Confirmation dialog that requires a written reason (cancel / waive). */
export function ReasonDialog({ title, description, confirmLabel, pendingLabel, isPending, onConfirm, onClose }: ReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    if (!reason.trim()) {
      setError('El motivo es obligatorio')
      return
    }
    setError('')
    try {
      await onConfirm(reason.trim())
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.fields.reason) setError(err.fields.reason)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason-text">Motivo</Label>
          <Textarea
            id="reason-text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'reason-text-error' : undefined}
            disabled={isPending}
            rows={3}
          />
          {error && (
            <p id="reason-text-error" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Volver</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              void submit()
            }}
            disabled={isPending}
          >
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
