import { Hand, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBulkCreateMatches } from '@/features/league-admin/matches/api'
import type { Tournament } from '@/features/leagues/types'
import { ApiError } from '@/lib/api/client'

import { useTournamentMatches } from '../api'

interface ManualRow {
  id: string
  home: string
  away: string
  date: string
  time: string
  field: string
}

interface ManualRoundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tournaments: Tournament[]
  getActiveTeams: (tournamentId?: string) => Array<{ id: string; name: string }>
}

const newRow = (prev?: ManualRow): ManualRow => ({
  id: crypto.randomUUID(),
  home: '',
  away: '',
  date: prev?.date ?? '',
  time: prev?.time ?? '08:00',
  field: prev?.field ?? '1',
})

const SELECT = 'h-9 w-full border-white/10 bg-slate-800/50 text-xs text-white'

/** "Modo Manual": builds one round by hand (teams, date, time, field) and creates it in one request. */
export function ManualRoundDialog({ open, onOpenChange, tournaments, getActiveTeams }: ManualRoundDialogProps) {
  const [tournamentId, setTournamentId] = useState('')
  const [round, setRound] = useState('')
  const [rows, setRows] = useState<ManualRow[]>([newRow()])
  const [errors, setErrors] = useState<string[]>([])

  const existing = useTournamentMatches(tournamentId)
  const bulkCreate = useBulkCreateMatches()
  const teams = getActiveTeams(tournamentId)
  const existingRounds = new Set((existing.data?.data ?? []).map((m) => m.round))
  const nextRound = Math.max(0, ...(existing.data?.data ?? []).map((m) => m.round ?? 0)) + 1
  const roundNumber = Number(round || nextRound)

  const patch = (id: string, change: Partial<ManualRow>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...change } : x)))

  const validate = (): string[] => {
    const problems: string[] = []
    if (!tournamentId) problems.push('Selecciona un torneo.')
    if (!Number.isInteger(roundNumber) || roundNumber < 1) problems.push('El número de jornada debe ser mayor que 0.')
    rows.forEach((r, i) => {
      if (!r.home || !r.away || !r.date || !r.time) problems.push(`Partido ${i + 1}: completa equipos, fecha y hora.`)
      else if (r.home === r.away) problems.push(`Partido ${i + 1}: un equipo no puede jugar contra sí mismo.`)
      if (Number(r.field) < 1) problems.push(`Partido ${i + 1}: la cancha debe ser mayor que 0.`)
    })
    return problems
  }

  const handleSave = async () => {
    const problems = validate()
    setErrors(problems)
    if (problems.length > 0) return
    try {
      const created = await bulkCreate.mutateAsync({
        tournamentId,
        matches: rows.map((r) => ({
          home_team_id: r.home,
          away_team_id: r.away,
          match_date: `${r.date}T${r.time}:00Z`,
          match_time: r.time,
          round: roundNumber,
          field_number: Number(r.field),
        })),
      })
      toast.success(`Jornada ${roundNumber} creada con ${created.length} ${created.length === 1 ? 'partido' : 'partidos'}. Publícala desde el calendario.`)
      setRows([newRow()])
      setRound('')
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.isValidation && Object.keys(err.fields).length > 0) {
        setErrors(Object.values(err.fields))
      } else {
        setErrors([])
        toast.error(err instanceof ApiError ? err.message : 'Error al crear la jornada')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !bulkCreate.isPending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm text-white md:text-lg">
            <Hand className="h-4 w-4 text-orange-400 md:h-5 md:w-5" aria-hidden="true" />
            Modo Manual
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400 md:text-sm">
            Arma una jornada a mano: elige local, visitante, fecha, hora y cancha de cada partido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <div>
              <Label htmlFor="manual-tournament" className="mb-1 block text-xs text-gray-400">Torneo</Label>
              <Select value={tournamentId} onValueChange={(v) => { setTournamentId(v); setErrors([]) }}>
                <SelectTrigger id="manual-tournament" className={SELECT}>
                  <SelectValue placeholder="Selecciona un torneo" />
                </SelectTrigger>
                <SelectContent>
                  {tournaments.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="manual-round" className="mb-1 block text-xs text-gray-400">Jornada</Label>
              <Input
                id="manual-round"
                type="number"
                min="1"
                value={round || String(nextRound)}
                onChange={(e) => setRound(e.target.value)}
                className="h-9 border-white/10 bg-slate-800/50 text-white"
              />
            </div>
          </div>

          {tournamentId && existingRounds.has(roundNumber) && (
            <p className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2 text-xs text-yellow-400">
              La jornada {roundNumber} ya existe: los partidos se agregarán a ella.
            </p>
          )}

          {tournamentId && teams.length < 2 && (
            <p className="text-xs text-gray-400">Este torneo necesita al menos 2 equipos activos.</p>
          )}

          {tournamentId && (
            <ul className="space-y-3">
              {rows.map((r, i) => (
                <li key={r.id} className="space-y-2 rounded-lg border border-white/5 bg-slate-700/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">Partido {i + 1}</span>
                    {rows.length > 1 && (
                      <Button size="sm" variant="ghost" aria-label={`Quitar partido ${i + 1}`} onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))} className="h-7 w-7 p-0 text-red-400">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([['home', 'Local'], ['away', 'Visitante']] as const).map(([side, label]) => (
                      <Select key={side} value={r[side]} onValueChange={(v) => patch(r.id, { [side]: v })}>
                        <SelectTrigger aria-label={`${label} (partido ${i + 1})`} className={SELECT}>
                          <SelectValue placeholder={label} />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input type="date" aria-label={`Fecha (partido ${i + 1})`} value={r.date} onChange={(e) => patch(r.id, { date: e.target.value })} className="h-9 border-white/10 bg-slate-800/50 text-xs text-white" />
                    <Input type="time" aria-label={`Hora (partido ${i + 1})`} value={r.time} onChange={(e) => patch(r.id, { time: e.target.value })} className="h-9 border-white/10 bg-slate-800/50 text-xs text-white" />
                    <Input type="number" min="1" aria-label={`Cancha (partido ${i + 1})`} value={r.field} onChange={(e) => patch(r.id, { field: e.target.value })} className="h-9 border-white/10 bg-slate-800/50 text-xs text-white" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {tournamentId && (
            <Button type="button" variant="outline" size="sm" onClick={() => setRows((x) => [...x, newRow(x[x.length - 1])])} className="w-full border-white/10 bg-slate-800/50 text-gray-300 hover:text-white">
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Agregar partido
            </Button>
          )}

          {errors.length > 0 && (
            <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <ul className="list-inside list-disc space-y-1">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={bulkCreate.isPending} className="h-9 flex-1 border-white/10 bg-slate-800/50 text-xs text-gray-400 hover:text-white">
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={bulkCreate.isPending || !tournamentId} className="h-9 flex-1 bg-green-500 text-xs text-white hover:bg-green-600">
              {bulkCreate.isPending ? 'Creando…' : 'Crear jornada'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
