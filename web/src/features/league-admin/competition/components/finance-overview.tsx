import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { formatMoney } from '../money'
import type { TeamBalance, Transaction } from '../types'
import { TransactionStatusBadge } from './finance-status-badge'

const glass = 'backdrop-blur-xl bg-white/10 border-white/20'
const row = 'flex items-center justify-between p-3 backdrop-blur-md bg-white/5 rounded-lg border border-white/10'
const linkButton = 'text-white/70 hover:text-white hover:bg-white/10'

interface Props {
  recent: Transaction[]
  balances: TeamBalance[]
  teamNames: Map<string, string>
  overdueCount: number
  totalOverdue?: string
  onTab: (tab: string) => void
}

/** "Resumen" tab: latest movements, teams with the highest debt and the overdue alert. */
export function FinanceOverview({ recent, balances, teamNames, overdueCount, totalOverdue, onTab }: Props) {
  const topDebt = balances
    .filter((b) => Number(b.pending_balance) > 0)
    .sort((a, b) => Number(b.pending_balance) - Number(a.pending_balance))
    .slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className={glass}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white drop-shadow-lg">Transacciones Recientes</CardTitle>
              <CardDescription className="text-white/70">Últimos movimientos registrados</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onTab('transactions')} className={linkButton}>
              Ver todas
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.length > 0 ? (
              recent.map((tx) => (
                <div key={tx.id} className={row}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{tx.description}</p>
                    <p className="text-sm text-white/60">
                      {(tx.team_id && teamNames.get(tx.team_id)) || 'Sin equipo'} - {new Date(tx.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`font-semibold ${tx.is_income ? 'text-emerald-400' : 'text-white'}`}>{formatMoney(tx.amount)}</span>
                    <TransactionStatusBadge status={tx.status} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-white/60 text-center py-4">No hay transacciones registradas</p>
            )}
          </CardContent>
        </Card>

        <Card className={glass}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white drop-shadow-lg">Equipos con Mayor Deuda</CardTitle>
              <CardDescription className="text-white/70">Equipos con saldo pendiente</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onTab('balances')} className={linkButton}>
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDebt.length > 0 ? (
              topDebt.map((team) => (
                <div key={team.team_id} className={row}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{team.team_name}</p>
                    <p className="text-sm text-white/60">
                      {team.overdue_count > 0 && <span className="text-red-400">{team.overdue_count} vencido(s)</span>}
                      {team.pending_fines_count > 0 && <span className="text-amber-400 ml-2">{team.pending_fines_count} multa(s)</span>}
                    </p>
                  </div>
                  <span className="font-semibold text-red-400 ml-4">{formatMoney(team.pending_balance)}</span>
                </div>
              ))
            ) : (
              <p className="text-white/60 text-center py-4">Todos los equipos están al corriente</p>
            )}
          </CardContent>
        </Card>
      </div>

      {overdueCount > 0 && (
        <Card className="backdrop-blur-xl bg-red-500/10 border-red-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-red-200">Hay {overdueCount} transacciones vencidas</h3>
                <p className="text-red-100/70 text-sm mt-1">Total vencido: {formatMoney(totalOverdue)}</p>
                <Button variant="outline" size="sm" className="mt-3 border-red-400/50 bg-transparent text-red-200 hover:bg-red-500/20 hover:text-red-100" onClick={() => onTab('transactions')}>
                  Ver transacciones vencidas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
