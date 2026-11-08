import { Shield, Target, Trophy, Users } from 'lucide-react'
import { LoadingState, EmptyState } from '@/components/states'
import { useAdminLeagues, useSystemStats } from '../api'

/** System-wide statistics from GET /admin/stats (counted server-side). */
export function SystemStats() {
  const stats = useSystemStats()
  const leagues = useAdminLeagues({ limit: 100 })

  const recentLeagues = [...(leagues.data?.data ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)

  if (stats.isPending) return <LoadingState label="Cargando estadísticas…" />

  if (stats.isError) {
    return (
      <EmptyState
        title="No se pudieron cargar las estadísticas"
        description="Intenta nuevamente para ver los datos del sistema."
      />
    )
  }

  const data = stats.data
  const tiles = [
    { title: 'Ligas', count: data.leagues, icon: Trophy, color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
    { title: 'Torneos', count: data.tournaments, icon: Target, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
    { title: 'Equipos', count: data.teams, icon: Shield, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' },
    { title: 'Jugadores', count: data.players, icon: Users, color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20' },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-white">Estadísticas del Sistema</h2>
        <p className="text-gray-500 text-sm">Resumen general de todas las ligas</p>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ title, count, icon: Icon, color, bgColor, borderColor }) => (
          <div key={title} className={`rounded-xl ${bgColor} border ${borderColor} p-3 md:p-4 transition-all`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm text-gray-400">{title}</span>
              <div className="p-1.5 md:p-2 rounded-lg bg-slate-800/50">
                <Icon className={`w-3 h-3 md:w-4 md:h-4 ${color}`} aria-hidden="true" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl md:text-2xl font-bold ${color}`}>{count.active}</span>
              <span className="text-xs md:text-sm text-gray-500">/{count.total}</span>
            </div>
            <p className="text-[10px] md:text-xs text-gray-500 mt-1">
              {count.active === count.total ? 'Todos activos' : `${count.total - count.active} inactivos`}
            </p>
          </div>
        ))}
      </div>

      <dl className="grid grid-cols-3 gap-3 text-center">
        {[
          ['Usuarios', `${data.users.active}/${data.users.total}`],
          ['Administradores de liga', String(data.league_admins)],
          ['Propietarios de equipo', String(data.team_owners)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-800/50 border border-white/10 p-3">
            <dd className="text-lg font-bold text-white">{value}</dd>
            <dt className="text-[10px] md:text-xs text-gray-500">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
        <h3 className="text-sm md:text-base font-semibold text-white mb-3">Ligas Recientes</h3>
        <div className="space-y-2">
          {recentLeagues.length > 0 ? (
            recentLeagues.map((league) => (
              <div
                key={league.id}
                className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-slate-700/30 border border-white/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white text-xs md:text-sm truncate">{league.name}</p>
                  <p className="text-[10px] md:text-xs text-gray-500 truncate">/{league.slug}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs flex-shrink-0 ml-2 ${
                    league.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {league.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs md:text-sm text-gray-500 py-4 text-center">No hay ligas registradas</p>
          )}
        </div>
      </div>
    </div>
  )
}
