import { AlertCircle } from 'lucide-react'
import { useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import { useCreateSuspension, useUpdateSuspension } from '../api'
import type { Suspension } from '../types'

interface SuspensionFormProps {
  leagueId?: string
  suspension?: Suspension
  onClose: () => void
}

export function SuspensionForm({ suspension, onClose }: SuspensionFormProps) {
  const [formData, setFormData] = useState({
    player_id: suspension?.player_id ?? '',
    team_id: suspension?.team_id ?? '',
    suspension_type: suspension?.suspension_type ?? 'red_card',
    reason: suspension?.reason ?? '',
    matches_to_serve: suspension?.matches_to_serve ?? 1,
    notes: suspension?.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const create = useCreateSuspension()
  const update = useUpdateSuspension(suspension?.id ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      if (suspension) {
        await update.mutateAsync({
          matches_to_serve: formData.matches_to_serve,
          notes: formData.notes,
        })
      } else {
        await create.mutateAsync({
          player_id: formData.player_id,
          team_id: formData.team_id,
          suspension_type: formData.suspension_type,
          reason: formData.reason,
          matches_to_serve: formData.matches_to_serve,
          notes: formData.notes,
        })
      }
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setErrors(err.fields)
      }
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{suspension ? 'Editar Suspensión' : 'Nueva Suspensión'}</DialogTitle>
          <DialogDescription>
            {suspension ? 'Actualiza los detalles de la suspensión' : 'Registra una nueva suspensión de jugador'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {create.isError || update.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {create.error instanceof Error
                  ? create.error.message
                  : update.error instanceof Error
                    ? update.error.message
                    : 'Error al guardar'}
              </AlertDescription>
            </Alert>
          ) : null}

          {!suspension && (
            <>
              <div className="space-y-2">
                <Label htmlFor="player_id">ID del Jugador</Label>
                <Input
                  id="player_id"
                  value={formData.player_id}
                  onChange={(e) => setFormData({ ...formData, player_id: e.target.value })}
                  placeholder="UUID del jugador"
                  aria-invalid={!!errors.player_id}
                  aria-describedby={errors.player_id ? 'player_id-error' : undefined}
                  disabled={isPending}
                />
                {errors.player_id && (
                  <p id="player_id-error" className="text-xs text-destructive">
                    {errors.player_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="team_id">ID del Equipo</Label>
                <Input
                  id="team_id"
                  value={formData.team_id}
                  onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                  placeholder="UUID del equipo"
                  aria-invalid={!!errors.team_id}
                  aria-describedby={errors.team_id ? 'team_id-error' : undefined}
                  disabled={isPending}
                />
                {errors.team_id && (
                  <p id="team_id-error" className="text-xs text-destructive">
                    {errors.team_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="suspension_type">Tipo de Suspensión</Label>
                <Select
                  value={formData.suspension_type}
                  onValueChange={(value: 'red_card' | 'yellow_accumulation' | 'disciplinary_committee' | 'other') =>
                    setFormData({ ...formData, suspension_type: value })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="suspension_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="red_card">Tarjeta Roja</SelectItem>
                    <SelectItem value="yellow_accumulation">Acumulación de Amarillas</SelectItem>
                    <SelectItem value="disciplinary_committee">Comité Disciplinario</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Input
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Motivo de la suspensión"
                  aria-invalid={!!errors.reason}
                  aria-describedby={errors.reason ? 'reason-error' : undefined}
                  disabled={isPending}
                />
                {errors.reason && (
                  <p id="reason-error" className="text-xs text-destructive">
                    {errors.reason}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="matches_to_serve">Jornadas a Suspender</Label>
            <Input
              id="matches_to_serve"
              type="number"
              min="1"
              value={formData.matches_to_serve}
              onChange={(e) => setFormData({ ...formData, matches_to_serve: parseInt(e.target.value, 10) })}
              aria-invalid={!!errors.matches_to_serve}
              aria-describedby={errors.matches_to_serve ? 'matches-error' : undefined}
              disabled={isPending}
            />
            {errors.matches_to_serve && (
              <p id="matches-error" className="text-xs text-destructive">
                {errors.matches_to_serve}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales"
              disabled={isPending}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
