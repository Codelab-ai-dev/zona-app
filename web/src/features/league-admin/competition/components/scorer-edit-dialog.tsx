import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useSetManualStats, type ManualStats } from '../api'
import type { PlayerStats } from '../types'

const inputClass = 'backdrop-blur-md bg-white/10 border-white/30 text-white'
const count = (value: string) => Math.max(0, parseInt(value, 10) || 0)

/**
 * Original "Editar Estadísticas - {jugador}": the admin types the player's TOTAL goals/assists and the
 * difference is applied as a manual (extemporaneous) adjustment, so goals from matches are never touched.
 * The tables already include the manual part, so: new manual = wanted total - (shown total - current manual).
 */
export function ScorerEditDialog({
  scorer,
  manual,
  tournamentId,
  onClose,
}: {
  scorer: PlayerStats
  manual?: ManualStats
  tournamentId: string
  onClose: () => void
}) {
  const [goals, setGoals] = useState(String(scorer.goals))
  const [assists, setAssists] = useState(String(scorer.assists))
  const [error, setError] = useState('')
  const save = useSetManualStats(tournamentId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const goalsDiff = count(goals) - scorer.goals
    const assistsDiff = count(assists) - scorer.assists
    if (goalsDiff === 0 && assistsDiff === 0) {
      toast.info('No hay cambios que guardar')
      onClose()
      return
    }
    try {
      await save.mutateAsync({
        playerId: scorer.player_id,
        // Like the original, the manual part never goes below zero.
        goals: Math.max(0, (manual?.goals ?? 0) + goalsDiff),
        assists: Math.max(0, (manual?.assists ?? 0) + assistsDiff),
        yellow_cards: manual?.yellow_cards ?? 0,
        red_cards: manual?.red_cards ?? 0,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estadísticas')
    }
  }

  const pending = save.isPending
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-md bg-slate-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-white drop-shadow-lg">Editar Estadísticas - {scorer.player_name}</DialogTitle>
          <DialogDescription className="text-white/70">Modifica los goles y asistencias totales del jugador.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-goals" className="text-white/90">Total Goles</Label>
              <Input id="edit-goals" type="number" min={0} value={goals} onChange={(e) => setGoals(e.target.value)} disabled={pending} className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-assists" className="text-white/90">Total Asistencias</Label>
              <Input id="edit-assists" type="number" min={0} value={assists} onChange={(e) => setAssists(e.target.value)} disabled={pending} className={inputClass} />
            </div>
          </div>
          <p className="text-xs text-white/50">
            Los cambios se aplicarán como ajuste extemporáneo. Los goles registrados en partidos no serán modificados.
          </p>
          {error && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending} className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="backdrop-blur-md bg-blue-500/80 hover:bg-blue-500/90 text-white border-0">
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Guardando…
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

