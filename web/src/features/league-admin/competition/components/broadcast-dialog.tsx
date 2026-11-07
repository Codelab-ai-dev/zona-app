import { useState } from 'react'
import { toast } from 'sonner'

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'

import { useBroadcastRound, useTournaments } from '../api'

/** Sends a round's fixtures to every active WhatsApp link of the league. */
export function BroadcastDialog({ leagueId, onClose }: { leagueId: string; onClose: () => void }) {
  const tournaments = useTournaments(leagueId)
  const broadcast = useBroadcastRound(leagueId)
  const [tournamentId, setTournamentId] = useState('')
  const [round, setRound] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found: Record<string, string> = {}
    if (!tournamentId) found.tournament_id = 'Selecciona un torneo'
    if (!/^\d+$/.test(round.trim()) || Number(round) < 1) found.round = 'Ingresa una jornada válida (1 o más)'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    try {
      const summary = await broadcast.mutateAsync({ tournament_id: tournamentId, round: Number(round) })
      toast.success(
        `Jornada enviada: ${summary.sent} enviados, ${summary.failed} fallidos, ${summary.skipped} omitidos`,
      )
      onClose()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) setErrors(err.fields)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar jornada por WhatsApp</DialogTitle>
          <DialogDescription>Notifica los partidos de una jornada a todos los enlaces activos</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="broadcast-tournament">Torneo</Label>
            <Select value={tournamentId} onValueChange={setTournamentId} disabled={broadcast.isPending}>
              <SelectTrigger
                id="broadcast-tournament"
                aria-invalid={!!errors.tournament_id}
                aria-describedby={errors.tournament_id ? 'broadcast-tournament-error' : undefined}
              >
                <SelectValue placeholder="Selecciona un torneo" />
              </SelectTrigger>
              <SelectContent>
                {(tournaments.data?.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tournament_id && (
              <p id="broadcast-tournament-error" className="text-xs text-destructive">
                {errors.tournament_id}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-round">Jornada</Label>
            <Input
              id="broadcast-round"
              type="number"
              min="1"
              value={round}
              onChange={(e) => setRound(e.target.value)}
              aria-invalid={!!errors.round}
              aria-describedby={errors.round ? 'broadcast-round-error' : undefined}
              disabled={broadcast.isPending}
            />
            {errors.round && (
              <p id="broadcast-round-error" className="text-xs text-destructive">
                {errors.round}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={broadcast.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={broadcast.isPending}>
              {broadcast.isPending ? 'Enviando…' : 'Enviar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
