import { useQueries } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, CheckCircle2, Shield, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'

import { LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLeagueTournaments } from '@/features/leagues/api'
import { api } from '@/lib/api/client'

import { matchKeys } from './api'
import { MatchResultDialog } from './components/match-result-dialog'
import type { MatchWithRelations } from './types'

interface ResultsPageProps {
  leagueId: string
}

const TRIGGER = 'h-8 w-auto min-w-[140px] border-white/10 bg-slate-700/50 px-3 text-xs text-white'

const formatDate = (date: string, time?: string) =>
  `${new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })} - ${time ? time.slice(0, 5) : 'Sin hora'}`

function TeamLogo({ name, logo }: { name: string; logo?: string }) {
  return logo ? (
    <img src={logo} alt={name} width={24} height={24} className="h-5 w-5 flex-shrink-0 rounded-full object-cover md:h-6 md:w-6" />
  ) : (
    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 md:h-6 md:w-6">
      <Shield className="h-3 w-3 text-gray-500" role="img" aria-label={name} />
    </div>
  )
}

/**
 * "Resultados" tab of the original dashboard (Captura de Resultados): the
 * scheduled and in-progress matches of every tournament of the league, with
 * filters, to register their result.
 */
export function ResultsPage({ leagueId }: ResultsPageProps) {
  const tournaments = useLeagueTournaments(leagueId)
  const list = tournaments.data?.data
  const queries = useQueries({
    queries: (list ?? []).map((t) => ({
      queryKey: matchKeys.byTournament(t.id),
      queryFn: ({ signal }: { signal: AbortSignal }) => api.list<MatchWithRelations>(`/tournaments/${t.id}/matches`, { limit: 1000 }, { signal }),
    })),
  })
  const [tournamentFilter, setTournamentFilter] = useState('all')
  const [roundFilter, setRoundFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [selected, setSelected] = useState<MatchWithRelations | null>(null)
  const [savedOpen, setSavedOpen] = useState(false)

  const names = useMemo(() => new Map((list ?? []).map((t) => [t.id, t.name])), [list])
  const pending = useMemo(
    () =>
      queries
        .flatMap((q) => q.data?.data ?? [])
        .filter((m) => m.status === 'scheduled' || m.status === 'in_progress')
        .sort((a, b) => a.match_date.localeCompare(b.match_date) || (a.match_time ?? '').localeCompare(b.match_time ?? '')),
    [queries],
  )

  const inTournament = pending.filter((m) => tournamentFilter === 'all' || m.tournament_id === tournamentFilter)
  const rounds = [...new Set(inTournament.map((m) => m.round).filter((r): r is number => r !== undefined))].sort((a, b) => a - b)
  const teams = [...new Map(inTournament.flatMap((m) => [[m.home_team_id, m.home_team_name], [m.away_team_id, m.away_team_name]] as const)).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const filtered = inTournament
    .filter((m) => roundFilter === 'all' || m.round === Number(roundFilter))
    .filter((m) => teamFilter === 'all' || m.home_team_id === teamFilter || m.away_team_id === teamFilter)
  const tournamentOptions = (list ?? []).filter((t) => pending.some((m) => m.tournament_id === t.id))
  const hasFilters = tournamentFilter !== 'all' || roundFilter !== 'all' || teamFilter !== 'all'
  const clear = () => {
    setTournamentFilter('all')
    setRoundFilter('all')
    setTeamFilter('all')
  }

  if (tournaments.isPending || queries.some((q) => q.isPending)) return <LoadingState label="Cargando partidos..." />
  if (tournaments.isError || queries.some((q) => q.isError)) {
    return (
      <div role="alert" className="rounded-xl border border-white/10 bg-slate-800/50 p-6 text-center text-sm text-red-400">
        No se pudieron cargar los partidos.
        <Button variant="outline" size="sm" className="ml-3" onClick={() => { void tournaments.refetch(); queries.forEach((q) => void q.refetch()) }}>Reintentar</Button>
      </div>
    )
  }

  return (
    <section className="space-y-4 py-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-green-500/20 p-2"><CalendarDays className="h-5 w-5 text-green-400" aria-hidden="true" /></div>
        <div>
          <h1 className="text-base font-bold text-white md:text-lg">Captura de Resultados</h1>
          <p className="text-xs text-gray-500">Selecciona un partido para registrar su resultado</p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="space-y-3 rounded-xl border border-white/10 bg-slate-800/50 p-3 md:p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Filtrar partidos</h2>
            {hasFilters && <button type="button" onClick={clear} className="text-[10px] text-gray-500 transition-colors hover:text-white">Limpiar filtros</button>}
          </div>
          <div className="flex flex-wrap gap-2">
            {tournamentOptions.length > 1 && (
              <Select value={tournamentFilter} onValueChange={(v) => { setTournamentFilter(v); setRoundFilter('all'); setTeamFilter('all') }}>
                <SelectTrigger aria-label="Torneo" className={TRIGGER}><SelectValue placeholder="Torneo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"><Trophy className="h-3 w-3 text-blue-400" aria-hidden="true" />Todos los torneos</SelectItem>
                  {tournamentOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}><Trophy className="h-3 w-3 text-yellow-400" aria-hidden="true" />{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={roundFilter} onValueChange={setRoundFilter}>
              <SelectTrigger aria-label="Jornada" className={TRIGGER}><SelectValue placeholder="Jornada" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><CalendarDays className="h-3 w-3 text-blue-400" aria-hidden="true" />Todas las jornadas</SelectItem>
                {rounds.map((r) => (
                  <SelectItem key={r} value={String(r)}><CalendarDays className="h-3 w-3 text-yellow-400" aria-hidden="true" />Jornada {r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger aria-label="Equipo" className={TRIGGER}><SelectValue placeholder="Equipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><Shield className="h-3 w-3 text-blue-400" aria-hidden="true" />Todos los equipos</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}><Shield className="h-3 w-3 text-green-400" aria-hidden="true" />{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {pending.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-slate-800/50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-gray-500" aria-hidden="true" />
          <h2 className="mb-1 text-sm font-medium text-white">No hay partidos disponibles</h2>
          <p className="text-xs text-gray-500">No hay partidos programados o en progreso</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-slate-800/50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-gray-500" aria-hidden="true" />
          <h2 className="mb-1 text-sm font-medium text-white">No hay partidos con estos filtros</h2>
          <p className="mb-4 text-xs text-gray-500">Prueba con otros filtros o limpia los actuales</p>
          <Button variant="outline" size="sm" onClick={clear} className="border-white/10 bg-slate-700/50 text-xs text-gray-400 hover:text-white">Limpiar filtros</Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setSelected(m)}
                aria-label={`Registrar resultado: ${m.home_team_name} vs ${m.away_team_name}`}
                className="w-full rounded-xl border border-white/10 bg-slate-800/50 p-3 text-left transition-all hover:bg-slate-700/50 md:p-4"
              >
                <span className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-gray-400">{names.get(m.tournament_id)}</span>
                  {m.round !== undefined && <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-gray-400">J{m.round}</span>}
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${m.status === 'in_progress' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {m.status === 'in_progress' ? 'En Juego' : 'Programado'}
                  </span>
                </span>
                <span className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <TeamLogo name={m.home_team_name} logo={m.home_team_logo} />
                    <span className="truncate text-xs font-medium text-white md:text-sm">{m.home_team_name}</span>
                  </span>
                  <span className="flex-shrink-0 text-xs text-gray-500">vs</span>
                  <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    <span className="truncate text-xs font-medium text-white md:text-sm">{m.away_team_name}</span>
                    <TeamLogo name={m.away_team_name} logo={m.away_team_logo} />
                  </span>
                </span>
                <span className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 md:text-xs">{formatDate(m.match_date, m.match_time)}</span>
                  <span className="rounded bg-green-500/20 px-2 py-1 text-[10px] font-medium text-green-400">Registrar</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <MatchResultDialog
          match={selected}
          leagueId={leagueId}
          open
          onOpenChange={() => setSelected(null)}
          onSaved={() => {
            setSelected(null)
            setSavedOpen(true)
          }}
        />
      )}

      <Dialog open={savedOpen} onOpenChange={setSavedOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-4 flex items-center justify-center">
              <div className="rounded-full bg-green-100 p-3"><CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden="true" /></div>
            </div>
            <DialogTitle className="text-center text-xl">¡Resultado Guardado!</DialogTitle>
            <DialogDescription className="text-center">
              El resultado del partido se ha registrado exitosamente. Las estadísticas se actualizarán automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4"><Button onClick={() => setSavedOpen(false)}>Continuar</Button></div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
