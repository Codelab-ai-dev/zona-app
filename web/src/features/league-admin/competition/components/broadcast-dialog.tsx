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
      <DialogContent className="max-w-[95vw] md:max-w-lg bg-slate-900 border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg font-bold text-white">Enviar jornada por WhatsApp</DialogTitle>
          <DialogDescription className="text-gray-400 text-xs md:text-sm">Notifica los partidos de una jornada a todos los enlaces activos</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="broadcast-tournament" className="text-[10px] md:text-xs text-gray-400">Torneo</Label>
            <Select value={tournamentId} onValueChange={setTournamentId} disabled={broadcast.isPending}>
              <SelectTrigger
                id="broadcast-tournament" className="h-10 bg-slate-800/50 border-white/10 text-white text-sm"
                aria-invalid={!!errors.tournament_id}
                aria-describedby={errors.tournament_id ? 'broadcast-tournament-error' : undefined}
              >
                <SelectValue placeholder="Selecciona un torneo" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                {(tournaments.data?.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tournament_id && (
              <p id="broadcast-tournament-error" className="text-xs text-red-400">
                {errors.tournament_id}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="broadcast-round" className="text-[10px] md:text-xs text-gray-400">Jornada</Label>
            <Input
              className="h-10 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
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
              <p id="broadcast-round-error" className="text-xs text-red-400">
                {errors.round}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={broadcast.isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white" disabled={broadcast.isPending}>
              {broadcast.isPending ? 'Enviando…' : 'Enviar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
