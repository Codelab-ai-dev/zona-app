import { Calendar as CalendarIcon, Shield, Trophy } from 'lucide-react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CalendarFiltersProps {
  round: number | 'all'
  team: string
  rounds: number[]
  teams: { id: string; name: string }[]
  onRound: (round: number | 'all') => void
  onTeam: (team: string) => void
}

/** Round and team filters of the calendar. */
export function CalendarFilters({ round, team, rounds, teams, onRound, onTeam }: CalendarFiltersProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/50 p-3 md:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">Filtrar partidos</h3>
          <p className="text-xs text-gray-500">Filtra por jornada o equipo</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="w-full sm:w-48">
            <Select value={String(round)} onValueChange={(v) => onRound(v === 'all' ? 'all' : Number(v))}>
              <SelectTrigger
                aria-label="Jornada"
                className="h-9 w-full border-white/10 bg-slate-700/50 text-sm text-white"
              >
                <SelectValue placeholder="Jornada" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900">
                <SelectItem value="all" className="text-white">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                    Todas las jornadas
                  </span>
                </SelectItem>
                {rounds.map((r) => (
                  <SelectItem key={r} value={String(r)} className="text-white">
                    <span className="flex items-center gap-2">
                      <Trophy className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" />
                      Jornada {r}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-52">
            <Select value={team} onValueChange={onTeam}>
              <SelectTrigger
                aria-label="Equipo"
                className="h-9 w-full border-white/10 bg-slate-700/50 text-sm text-white"
              >
                <SelectValue placeholder="Equipo" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-slate-900">
                <SelectItem value="all" className="text-white">
                  <span className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                    Todos los equipos
                  </span>
                </SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-white">
                    <span className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />
                      {t.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
