import { Trophy, Shield, Users } from 'lucide-react'
import { LoadingState, EmptyState } from '@/components/states'
import { useAdminLeagues, useAdminUsers } from '../api'

/** System-wide statistics computed from available list endpoints. */
export function SystemStats() {
  const leagues = useAdminLeagues({ limit: 100 })
  const users = useAdminUsers({ limit: 100 })

  const statsLoading = leagues.isPending || users.isPending
  const statsError = leagues.isError || users.isError

  const leaguesTotal = leagues.data?.page.total ?? leagues.data?.data.length ?? 0
  const leaguesActive = leagues.data?.data.filter((l) => l.is_active).length ?? 0
  const usersTotal = users.data?.page.total ?? users.data?.data.length ?? 0
  const leagueAdmins = users.data?.data.filter((u) => u.role === 'league_admin').length ?? 0

  const recentLeagues = [...(leagues.data?.data ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)

  if (statsLoading) return <LoadingState label="Cargando estadísticas…" />

  if (statsError) {
    return (
      <EmptyState
        title="No se pudieron cargar las estadísticas"
        description="Intenta nuevamente para ver los datos del sistema."
      />
    )
  }

  const stats = [
    {
      title: 'Ligas',
      value: leaguesActive,
      total: leaguesTotal,
      icon: Trophy,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    {
      title: 'Administradores',
      value: leagueAdmins,
      total: usersTotal,
      icon: Shield,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'Total de Usuarios',
      value: usersTotal,
      total: usersTotal,
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-bold text-white">Estadísticas del Sistema</h2>
        <p className="text-gray-500 text-sm">Resumen general de todas las ligas</p>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className={`rounded-xl ${stat.bgColor} border ${stat.borderColor} p-3 md:p-4 transition-all`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs md:text-sm text-gray-400">{stat.title}</span>
                <div className="p-1.5 md:p-2 rounded-lg bg-slate-800/50">
                  <Icon className={`w-3 h-3 md:w-4 md:h-4 ${stat.color}`} aria-hidden="true" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl md:text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-xs md:text-sm text-gray-500">/{stat.total}</span>
              </div>
              <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                {stat.value === stat.total ? 'Todos activos' : `${stat.total - stat.value} inactivos`}
              </p>
            </div>
          )
        })}
      </div>

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
