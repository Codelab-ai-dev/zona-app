import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTeamsByLeague } from '@/features/league-admin/teams/api'
import { useTeamPlayers } from '@/features/public/api'
import { ApiError } from '@/lib/api/client'

import { useSetManualStats, type ManualStats, type ManualStatsInput } from '../api'

type Field = keyof ManualStatsInput

const FIELDS: { id: Field; label: string }[] = [
  { id: 'goals', label: 'Goles' },
  { id: 'assists', label: 'Asistencias' },
  { id: 'yellow_cards', label: 'Amarillas' },
  { id: 'red_cards', label: 'Rojas' },
]

const trigger = 'backdrop-blur-md bg-white/10 border-white/30 text-white'
const empty = { goals: '0', assists: '0', yellow_cards: '0', red_cards: '0' }

interface ManualStatsDialogProps {
  leagueId: string
  tournamentId: string
  /** Every manual entry of the tournament: adding to a player that already has one sums up. */
  entries: ManualStats[]
  /** When set the dialog edits that entry's totals; otherwise it adds goals to a picked player. */
  editing?: ManualStats
  onClose: () => void
}

/** "Agregar Goles" (extemporaneous stats) and edit of a player's manual totals. */
export function ManualStatsDialog({ leagueId, tournamentId, entries, editing, onClose }: ManualStatsDialogProps) {
  const [teamId, setTeamId] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [values, setValues] = useState<Record<Field, string>>(
    editing
      ? {
          goals: String(editing.goals),
          assists: String(editing.assists),
          yellow_cards: String(editing.yellow_cards),
          red_cards: String(editing.red_cards),
        }
      : empty,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const teams = useTeamsByLeague(editing ? '' : leagueId)
  const players = useTeamPlayers(editing || !teamId ? undefined : teamId)
  const save = useSetManualStats(tournamentId)
  const targetId = editing?.player_id ?? playerId
  const existing = entries.find((entry) => entry.player_id === targetId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!editing && !teamId) next.team_id = 'Selecciona un equipo'
    else if (!editing && !playerId) next.player_id = 'Selecciona un jugador'
    for (const { id } of FIELDS) {
      const value = values[id].trim()
      if (!/^\d+$/.test(value) || Number(value) > 500) next[id] = 'Debe ser un entero entre 0 y 500'
    }
    if (Object.keys(next).length === 0 && !editing && FIELDS.every(({ id }) => Number(values[id]) === 0)) {
      next.goals = 'Agrega al menos un dato mayor a 0'
    }
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    setErrors({})
    const amount = (id: Field) => Number(values[id].trim()) + (editing ? 0 : (existing?.[id] ?? 0))
    try {
      await save.mutateAsync({
        playerId: targetId,
        goals: amount('goals'),
        assists: amount('assists'),
        yellow_cards: amount('yellow_cards'),
        red_cards: amount('red_cards'),
      })
      onClose()
    } catch (err) {
      if (err instanceof ApiError) setErrors(Object.keys(err.fields).length > 0 ? err.fields : { form: err.message })
    }
  }

  const pending = save.isPending
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-md bg-slate-900 border-white/20 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400" aria-hidden="true" />
            {editing ? 'Editar Estadísticas Manuales' : 'Agregar Goles Extemporáneos'}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            {editing
              ? `${editing.player_name} (${editing.team_name}). Estos totales reemplazan los registrados manualmente; los de partidos no cambian.`
              : 'Agrega goles históricos a jugadores para ligas que comenzaron antes del sistema.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <p role="alert" className="text-xs text-red-400">
              {errors.form}
            </p>
          )}
          {!editing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="manual-team" className="text-white/90">Equipo</Label>
                <Select
                  value={teamId}
                  onValueChange={(value) => {
                    setTeamId(value)
                    setPlayerId('')
                  }}
                  disabled={pending}
                >
                  <SelectTrigger id="manual-team" className={trigger} aria-invalid={Boolean(errors.team_id)} aria-describedby={errors.team_id ? 'manual-team-error' : undefined}>
                    <SelectValue placeholder={teams.isPending ? 'Cargando equipos…' : 'Selecciona un equipo'} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/20 max-h-60">
                    {(teams.data?.data ?? []).map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.team_id && <p id="manual-team-error" className="text-xs text-red-400">{errors.team_id}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-player" className="text-white/90">Jugador</Label>
                <Select value={playerId} onValueChange={setPlayerId} disabled={pending || !teamId}>
                  <SelectTrigger id="manual-player" className={`${trigger} disabled:opacity-50`} aria-invalid={Boolean(errors.player_id)} aria-describedby={errors.player_id ? 'manual-player-error' : undefined}>
                    <SelectValue placeholder={!teamId ? 'Primero selecciona un equipo' : players.isPending ? 'Cargando jugadores…' : 'Selecciona un jugador'} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/20 max-h-60">
                    {(players.data?.data ?? []).map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        #{player.jersey_number} {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.player_id && <p id="manual-player-error" className="text-xs text-red-400">{errors.player_id}</p>}
              </div>
              {existing && (
                <p className="text-xs text-white/60">
                  Ya tiene {existing.goals} gol(es) y {existing.assists} asistencia(s) manuales: lo que agregues se suma.
                </p>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(({ id, label }) => (
              <div key={id} className="space-y-2">
                <Label htmlFor={`manual-${id}`} className="text-white/90">{label}</Label>
                <Input
                  id={`manual-${id}`}
                  type="number"
                            value={values[id]}
                  onChange={(e) => setValues((prev) => ({ ...prev, [id]: e.target.value }))}
                  disabled={pending}
                  aria-invalid={Boolean(errors[id])}
                  aria-describedby={errors[id] ? `manual-${id}-error` : undefined}
                  className="backdrop-blur-md bg-white/10 border-white/30 text-white"
                />
                {errors[id] && <p id={`manual-${id}-error`} className="text-xs text-red-400">{errors[id]}</p>}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending} className="text-white/70 hover:text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="bg-green-500 hover:bg-green-600 text-white">
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              {pending ? 'Guardando…' : editing ? 'Guardar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
