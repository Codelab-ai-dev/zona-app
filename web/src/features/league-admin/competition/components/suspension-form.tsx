import { AlertCircle, AlertTriangle, Ban } from 'lucide-react'
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
import { useTeamPlayers, useTeamsByLeague } from '@/features/public/api'
import { ApiError } from '@/lib/api/client'

import { useCreateSuspension, useUpdateSuspension } from '../api'
import type { Suspension } from '../types'

interface SuspensionFormProps {
  leagueId: string
  suspension?: Suspension
  onClose: () => void
}

export function SuspensionForm({ leagueId, suspension, onClose }: SuspensionFormProps) {
  const [formData, setFormData] = useState({
    player_id: suspension?.player_id ?? '',
    team_id: suspension?.team_id ?? '',
    suspension_type: suspension?.suspension_type ?? 'red_card',
    reason: suspension?.reason ?? '',
    matches_to_serve: suspension?.matches_to_serve ?? 1,
    notes: suspension?.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const teams = useTeamsByLeague(suspension ? undefined : leagueId)
  const players = useTeamPlayers(suspension || !formData.team_id ? undefined : formData.team_id)
  const create = useCreateSuspension()
  const update = useUpdateSuspension(suspension?.id ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!suspension) {
      const missing: Record<string, string> = {}
      if (!formData.team_id) missing.team_id = 'Selecciona un equipo'
      if (!formData.player_id) missing.player_id = 'Selecciona un jugador'
      if (!formData.reason.trim()) missing.reason = 'El motivo es obligatorio'
      if (Object.keys(missing).length > 0) {
        setErrors(missing)
        return
      }
    }
    if (!Number.isInteger(formData.matches_to_serve) || formData.matches_to_serve < 1) {
      setErrors({ matches_to_serve: 'Debe ser al menos 1' })
      return
    }

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
          reason: formData.reason.trim(),
          matches_to_serve: formData.matches_to_serve,
          notes: formData.notes,
        })
      }
      onClose()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) {
        setErrors(err.fields)
      }
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-lg bg-slate-900 border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-400" aria-hidden="true" />
            {suspension ? 'Editar Suspensión' : 'Nueva Suspensión'}
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs md:text-sm">
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
                <Label htmlFor="team_id" className="text-[10px] text-gray-500 uppercase tracking-wide">Equipo</Label>
                <Select
                  value={formData.team_id}
                  onValueChange={(value) => setFormData({ ...formData, team_id: value, player_id: '' })}
                  disabled={isPending}
                >
                  <SelectTrigger
                    id="team_id" className="h-10 bg-slate-800/50 border-white/10 text-white text-sm"
                    aria-invalid={!!errors.team_id}
                    aria-describedby={errors.team_id ? 'team_id-error' : undefined}
                  >
                    <SelectValue placeholder="Selecciona un equipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                    {(teams.data?.data ?? []).map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.team_id && (
                  <p id="team_id-error" className="text-xs text-red-400">
                    {errors.team_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="player_id" className="text-[10px] text-gray-500 uppercase tracking-wide">Jugador</Label>
                <Select
                  value={formData.player_id}
                  onValueChange={(value) => setFormData({ ...formData, player_id: value })}
                  disabled={isPending || !formData.team_id}
                >
                  <SelectTrigger
                    id="player_id" className="h-10 bg-slate-800/50 border-white/10 text-white text-sm"
                    aria-invalid={!!errors.player_id}
                    aria-describedby={errors.player_id ? 'player_id-error' : undefined}
                  >
                    <SelectValue placeholder="Selecciona un jugador" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                    {(players.data?.data ?? []).map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name} (#{player.jersey_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.player_id && (
                  <p id="player_id-error" className="text-xs text-red-400">
                    {errors.player_id}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="suspension_type" className="text-[10px] text-gray-500 uppercase tracking-wide">Tipo de Suspensión</Label>
                <Select
                  value={formData.suspension_type}
                  onValueChange={(value: 'red_card' | 'yellow_accumulation' | 'disciplinary_committee' | 'other') =>
                    setFormData({ ...formData, suspension_type: value })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="suspension_type" className="h-10 bg-slate-800/50 border-white/10 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                    <SelectItem value="red_card">Tarjeta Roja</SelectItem>
                    <SelectItem value="yellow_accumulation">Acumulación de Amarillas</SelectItem>
                    <SelectItem value="disciplinary_committee">Comité Disciplinario</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-[10px] text-gray-500 uppercase tracking-wide">Motivo</Label>
                <Input
                  className="h-10 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Motivo de la suspensión"
                  aria-invalid={!!errors.reason}
                  aria-describedby={errors.reason ? 'reason-error' : undefined}
                  disabled={isPending}
                />
                {errors.reason && (
                  <p id="reason-error" className="text-xs text-red-400">
                    {errors.reason}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="matches_to_serve" className="text-[10px] text-gray-500 uppercase tracking-wide">Jornadas a Suspender</Label>
            <Input
                  className="h-10 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
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
              <p id="matches-error" className="text-xs text-red-400">
                {errors.matches_to_serve}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[10px] text-gray-500 uppercase tracking-wide">Notas</Label>
            <Textarea
              className="bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales"
              disabled={isPending}
              rows={3}
            />
          </div>

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs text-yellow-300/90">
                <p className="font-medium">Nota importante:</p>
                <p className="mt-1 text-yellow-300/70">
                  El jugador no podrá registrar asistencia en los próximos {Number.isFinite(formData.matches_to_serve) ? formData.matches_to_serve : 1} partido(s) de su equipo.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending} className="h-9 text-gray-400 hover:text-white hover:bg-slate-800/50 text-sm">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="h-9 bg-green-500 hover:bg-green-600 text-white text-sm">
              {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
