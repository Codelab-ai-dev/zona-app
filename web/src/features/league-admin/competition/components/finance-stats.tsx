import { AlertTriangle, TrendingUp, Users, Wallet, type LucideIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { formatMoney } from '../money'
import type { LeagueSummary, TeamBalance } from '../types'

interface StatsCardProps {
  title: string
  value: string
  description: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  alert?: boolean
}

function StatsCard({ title, value, description, icon: Icon, iconColor, iconBg, alert }: StatsCardProps) {
  return (
    <Card className={`backdrop-blur-xl bg-white/10 border-white/20 hover:bg-white/15 transition-all ${alert ? 'border-red-500/50' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/90 drop-shadow">{title}</CardTitle>
        <div className={`p-2 rounded-full backdrop-blur-md ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">{value}</div>
        <CardDescription className="text-xs text-white/70 drop-shadow">{description}</CardDescription>
      </CardContent>
    </Card>
  )
}

/** The four headline numbers of the finance dashboard. `summary` is undefined until the league has finance data. */
export function FinanceStats({
  summary,
  balances,
  currency,
  pendingCount,
}: {
  summary?: LeagueSummary
  balances: TeamBalance[]
  currency: string
  pendingCount: number
}) {
  const teamsWithDebt = balances.filter((b) => Number(b.pending_balance) > 0).length
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard title="Total Cobrado" value={formatMoney(summary?.total_collected, currency)} description="Ingresos recibidos" icon={TrendingUp} iconColor="text-emerald-400" iconBg="bg-emerald-500/20" />
      <StatsCard
        title="Pendiente de Cobro"
        value={formatMoney(summary?.total_pending, currency)}
        description={`${pendingCount} transacciones`}
        icon={Wallet}
        iconColor="text-blue-400"
        iconBg="bg-blue-500/20"
      />
      <StatsCard
        title="Vencido"
        value={formatMoney(summary?.total_overdue, currency)}
        description={`${summary?.overdue_transactions ?? 0} transacciones`}
        icon={AlertTriangle}
        iconColor="text-red-400"
        iconBg="bg-red-500/20"
        alert={(summary?.overdue_transactions ?? 0) > 0}
      />
      <StatsCard
        title="Equipos con Deuda"
        value={String(teamsWithDebt)}
        description={`de ${balances.length} equipos`}
        icon={Users}
        iconColor="text-amber-400"
        iconBg="bg-amber-500/20"
      />
    </div>
  )
}
