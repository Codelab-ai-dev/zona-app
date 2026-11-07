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
import { ApiError } from '@/lib/api/client'

import { useCreateTournament, useUpdateTournament } from '../api'
import type { Tournament } from '../types'

interface TournamentFormProps {
  leagueId: string
  tournament?: Tournament
  onClose: () => void
}

export function TournamentForm({ leagueId, tournament, onClose }: TournamentFormProps) {
  const [formData, setFormData] = useState({
    name: tournament?.name ?? '',
    start_date: tournament?.start_date ?? '',
    end_date: tournament?.end_date ?? '',
    tournament_format: tournament?.tournament_format ?? 'league',
    rounds_per_season: tournament?.rounds_per_season ?? 1,
    is_active: tournament?.is_active ?? true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const create = useCreateTournament()
  const update = useUpdateTournament(tournament?.id ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      if (tournament) {
        await update.mutateAsync({ ...formData, league_id: leagueId })
      } else {
        await create.mutateAsync({ ...formData, league_id: leagueId })
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
          <DialogTitle>{tournament ? 'Editar Torneo' : 'Crear Torneo'}</DialogTitle>
          <DialogDescription>
            {tournament ? 'Actualiza los detalles del torneo' : 'Crea un nuevo torneo para la liga'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {create.isError || update.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {create.error instanceof Error ? create.error.message : update.error instanceof Error ? update.error.message : 'Error al guardar'}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Torneo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              disabled={isPending}
            />
            {errors.name && (
              <p id="name-error" className="text-xs text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha Inicio</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                aria-invalid={!!errors.start_date}
                aria-describedby={errors.start_date ? 'start_date-error' : undefined}
                disabled={isPending}
              />
              {errors.start_date && (
                <p id="start_date-error" className="text-xs text-destructive">
                  {errors.start_date}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha Fin</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                aria-invalid={!!errors.end_date}
                aria-describedby={errors.end_date ? 'end_date-error' : undefined}
                disabled={isPending}
              />
              {errors.end_date && (
                <p id="end_date-error" className="text-xs text-destructive">
                  {errors.end_date}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tournament_format">Formato</Label>
              <Select
                value={formData.tournament_format}
                onValueChange={(value: 'league' | 'knockout' | 'group_knockout') =>
                  setFormData({ ...formData, tournament_format: value })
                }
                disabled={isPending}
              >
                <SelectTrigger id="tournament_format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="league">Liga Regular</SelectItem>
                  <SelectItem value="knockout">Eliminación</SelectItem>
                  <SelectItem value="group_knockout">Grupos + Eliminación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rounds_per_season">Jornadas</Label>
              <Select
                value={String(formData.rounds_per_season)}
                onValueChange={(value) =>
                  setFormData({ ...formData, rounds_per_season: parseInt(value, 10) })
                }
                disabled={isPending}
              >
                <SelectTrigger id="rounds_per_season">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
