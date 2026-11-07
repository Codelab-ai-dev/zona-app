import { Trophy, Shield, Users } from 'lucide-react'
import { LoadingState, EmptyState } from '@/components/states'
import { useAdminLeagues, useAdminUsers } from '../api'

/** System-wide statistics computed from available list endpoints. */
export function SystemStats() {
  const leagues = useAdminLeagues({ limit: 1 })
  const users = useAdminUsers({ limit: 1 })

  const statsLoading = leagues.isPending || users.isPending
  const statsError = leagues.isError || users.isError

  const leaguesTotal = leagues.data?.page.total ?? 0
  const leaguesActive = leagues.data?.data.filter((l) => l.is_active).length ?? 0
  const usersTotal = users.data?.page.total ?? 0
  const leagueAdmins = users.data?.data.filter((u) => u.role === 'league_admin').length ?? 0

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
        <h2 className="text-lg md:text-xl font-bold">Estadísticas del Sistema</h2>
        <p className="text-sm text-muted-foreground">Resumen general de todas las ligas</p>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className={`rounded-xl ${stat.bgColor} border ${stat.borderColor} p-3 md:p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs md:text-sm text-muted-foreground">{stat.title}</span>
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <Icon className={`w-3 h-3 md:w-4 md:h-4 ${stat.color}`} aria-hidden="true" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl md:text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="text-xs md:text-sm text-muted-foreground">/{stat.total}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
