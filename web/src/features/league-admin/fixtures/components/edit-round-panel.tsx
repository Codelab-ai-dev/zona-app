import { useQueryClient } from '@tanstack/react-query'
import { Calendar, Loader2, Plus, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBulkCreateMatches, useDeleteMatch, useUpdateMatchSchedule } from '@/features/league-admin/matches/api'
import { ApiError, api } from '@/lib/api/client'

import { fixturesKeys } from '../api'
import type { Match } from '../types'

interface EditRow {
  id: string
  home: string
  away: string
  date: string
  time: string
  field: number
  status: Match['status']
}

interface EditRoundPanelProps {
  leagueId: string
  tournamentId: string
  /** Every match of the tournament; the rounds to edit are the regular-phase ones. */
  matches: Match[]
  teams: Array<{ id: string; name: string }>
  onDone: () => void
}

const SELECT = 'h-9 w-full border-white/10 bg-slate-800/50 text-xs text-white'
const FIELD_LABEL = 'mb-1 block text-[10px] uppercase tracking-wide text-gray-500'
const isNew = (id: string) => id.startsWith('new-')

const toRow = (m: Match): EditRow => ({
  id: m.id,
  home: m.home_team_id,
  away: m.away_team_id,
  date: m.match_date.split('T')[0] ?? '',
  time: (m.match_time ?? '08:00').slice(0, 5),
  field: m.field_number ?? 1,
  status: m.status,
})

/** "Editar Anterior" of the manual mode: change, remove or add the matches of an existing round. */
export function EditRoundPanel({ leagueId, tournamentId, matches, teams, onDone }: EditRoundPanelProps) {
  const [round, setRound] = useState<number | null>(null)
  const [rows, setRows] = useState<EditRow[]>([])
  const [original, setOriginal] = useState<EditRow[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const queryClient = useQueryClient()
  const updateSchedule = useUpdateMatchSchedule()
  const deleteMatch = useDeleteMatch()
  const bulkCreate = useBulkCreateMatches()

  const regular = matches.filter((m) => m.phase === 'regular' && m.round !== undefined)
  const rounds = [...new Set(regular.map((m) => m.round as number))].sort((a, b) => a - b)

  const open = (n: number) => {
    const loaded = regular
      .filter((m) => m.round === n)
      .sort((a, b) => a.match_date.localeCompare(b.match_date) || (a.match_time ?? '').localeCompare(b.match_time ?? ''))
      .map(toRow)
    setRows(loaded)
    setOriginal(loaded)
    setRound(n)
    setError('')
  }
  const close = () => {
    setRound(null)
    setRows([])
    setOriginal([])
    setError('')
  }
  const patch = (id: string, change: Partial<EditRow>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...change } : x)))

  const save = async () => {
    if (round === null) return
    const invalid = rows.findIndex((r) => !r.home || !r.away || !r.date || !r.time)
    if (invalid >= 0) return setError('Todos los partidos deben tener equipos y fecha')
    const same = rows.findIndex((r) => r.home === r.away)
    if (same >= 0) return setError(`Partido ${same + 1}: un equipo no puede jugar contra sí mismo.`)
    setError('')
    setSaving(true)
    try {
      const keptIds = new Set(rows.map((r) => r.id))
      for (const gone of original.filter((o) => !keptIds.has(o.id))) await deleteMatch.mutateAsync(gone.id)
      for (const r of rows.filter((x) => !isNew(x.id))) {
        const o = original.find((x) => x.id === r.id)
        if (!o || JSON.stringify(o) === JSON.stringify(r)) continue
        await updateSchedule.mutateAsync({
          matchId: r.id,
          data: {
            ...(r.home !== o.home && { home_team_id: r.home }),
            ...(r.away !== o.away && { away_team_id: r.away }),
            ...((r.date !== o.date || r.time !== o.time) && { match_date: `${r.date}T${r.time}:00Z`, match_time: r.time }),
            ...(r.field !== o.field && { field_number: r.field }),
          },
        })
      }
      const added = rows.filter((x) => isNew(x.id))
      if (added.length > 0) {
        await bulkCreate.mutateAsync({
          tournamentId,
          matches: added.map((r) => ({
            home_team_id: r.home,
            away_team_id: r.away,
            match_date: `${r.date}T${r.time}:00Z`,
            match_time: r.time,
            round,
            field_number: r.field,
          })),
        })
      }
      void queryClient.invalidateQueries({ queryKey: fixturesKeys.all })
      toast.success(`Jornada ${round} actualizada exitosamente`)
      // Refresh the round's knowledge, like the original; a failure never undoes the save.
      api.post('/knowledge/triggers', { trigger_type: 'jornada_update', league_id: leagueId, tournament_id: tournamentId, round }).catch(() => {})
      close()
      onDone()
    } catch (err) {
      // Part of the changes may already be saved: show the real state.
      void queryClient.invalidateQueries({ queryKey: fixturesKeys.all })
      const msg = err instanceof ApiError ? err.message : 'Error desconocido'
      setError(`Error guardando jornada: ${msg}. Algunos cambios pudieron guardarse; revisa la jornada.`)
    } finally {
      setSaving(false)
    }
  }

  if (round === null) {
    return (
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
        <p className="mb-3 block text-[10px] uppercase tracking-wide text-orange-400">Seleccionar Jornada a Editar</p>
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {rounds.map((n) => (
            <li key={n}>
              <Button type="button" aria-label={`Editar jornada ${n}`} onClick={() => open(n)} className="h-12 w-full border-white/10 bg-slate-700/50 text-gray-300 hover:border-orange-500/30 hover:bg-orange-500/30 hover:text-orange-300">
                <span className="text-sm font-semibold">J{n}</span>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-orange-500/20 bg-slate-800/50">
      <div className="flex items-center justify-between border-b border-white/10 bg-orange-500/10 p-3 md:p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-orange-400 md:h-5 md:w-5" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white md:text-base">Editando Jornada {round}</h3>
          <span className="rounded bg-orange-500/20 px-2 py-0.5 text-[10px] text-orange-300">
            {rows.length} partido{rows.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button variant="ghost" size="sm" disabled={saving} onClick={close} className="h-8 border-0 bg-slate-600/50 px-3 text-gray-300 hover:bg-slate-600/70">
          Cambiar Jornada
        </Button>
      </div>

      <div className="space-y-3 p-3 md:p-4">
        {rows.length === 0 && <p className="py-3 text-center text-xs text-gray-500">No hay partidos en esta jornada</p>}
        <ul className="space-y-3">
          {rows.map((r, i) => {
            const locked = !isNew(r.id) && r.status !== 'scheduled'
            return (
              <li key={r.id} className="space-y-3 rounded-lg border border-white/5 bg-slate-700/30 p-3">
                {locked && (
                  <p className="text-[10px] text-yellow-400">
                    {r.status === 'finished' ? 'Partido finalizado' : r.status === 'in_progress' ? 'Partido en juego' : 'Partido cancelado'}: solo puedes cambiar fecha, hora y cancha.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {([['home', 'Local'], ['away', 'Visitante']] as const).map(([side, label]) => (
                    <div key={side}>
                      <Label className={FIELD_LABEL}>{label}</Label>
                      <Select value={r[side]} disabled={locked} onValueChange={(v) => patch(r.id, { [side]: v })}>
                        <SelectTrigger aria-label={`${label} (partido ${i + 1})`} className={SELECT}>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className={FIELD_LABEL}>Fecha</Label>
                    <Input type="date" aria-label={`Fecha (partido ${i + 1})`} value={r.date} onChange={(e) => patch(r.id, { date: e.target.value })} className="h-9 border-white/10 bg-slate-800/50 text-xs text-white" />
                  </div>
                  <div>
                    <Label className={FIELD_LABEL}>Hora</Label>
                    <Input type="time" aria-label={`Hora (partido ${i + 1})`} value={r.time} onChange={(e) => patch(r.id, { time: e.target.value })} className="h-9 border-white/10 bg-slate-800/50 text-xs text-white" />
                  </div>
                  <div>
                    <Label className={FIELD_LABEL}>Cancha</Label>
                    <Select value={String(r.field)} onValueChange={(v) => patch(r.id, { field: Number(v) })}>
                      <SelectTrigger aria-label={`Cancha (partido ${i + 1})`} className={SELECT}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!locked && (
                    <div className="flex items-end">
                      <Button variant="ghost" size="sm" aria-label={`Quitar partido ${i + 1}`} onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))} className="h-9 w-full border-0 bg-red-500/20 text-red-400 hover:bg-red-500/30">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setRows((x) => [...x, { id: `new-${crypto.randomUUID()}`, home: '', away: '', date: x.at(-1)?.date ?? '', time: x.at(-1)?.time ?? '08:00', field: 1, status: 'scheduled' }])}
          className="h-9 w-full border-white/10 bg-slate-600/50 text-xs text-gray-300 hover:bg-slate-600/70 hover:text-white"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Agregar Partido
        </Button>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>
        )}
      </div>

      <div className="flex gap-3 border-t border-white/10 bg-slate-700/30 p-3 md:p-4">
        <Button type="button" onClick={close} disabled={saving} className="h-10 flex-1 border-white/10 bg-slate-600/50 text-sm text-gray-300 hover:bg-slate-600/70 hover:text-white">
          Cancelar
        </Button>
        <Button onClick={() => void save()} disabled={saving || rows.length === 0} className="h-10 flex-1 border-0 bg-orange-500 text-sm text-white hover:bg-orange-600">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />}
          {saving ? 'Guardando…' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  )
}
