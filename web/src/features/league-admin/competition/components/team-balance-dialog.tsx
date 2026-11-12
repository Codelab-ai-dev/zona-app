import { Receipt } from 'lucide-react'

import { ErrorState, LoadingState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { useCurrency, useTeamBalance, useTeamTransactions } from '../api'
import { formatMoney } from '../money'
import type { TeamBalance } from '../types'
import { TeamAvatar, TransactionStatusBadge } from './finance-status-badge'
import { downloadStatement } from './statement-csv'
import { TransactionActions } from './transaction-actions'

function Summary({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
      <p className="text-xs text-white/50">{label}</p>
      <p className={`text-base sm:text-lg font-bold ${tone}`}>{value}</p>
    </div>
  )
}

/** A team's account statement: totals (GET .../balance), its transactions with row actions, and a CSV download. */
export function TeamBalanceDialog({ leagueId, team, onClose }: { leagueId: string; team: TeamBalance; onClose: () => void }) {
  const balance = useTeamBalance(leagueId, team.team_id)
  const transactions = useTeamTransactions(leagueId, team.team_id)
  const currency = useCurrency(leagueId)
  // Show the row's numbers until the fresh balance arrives.
  const totals = balance.data ?? team
  const history = transactions.data?.data ?? []

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-2xl bg-gray-900 border-white/20 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <TeamAvatar name={team.team_name} logo={team.team_logo} size="lg" />
            <span>{team.team_name}</span>
          </DialogTitle>
          <DialogDescription className="text-white/60">Estado de cuenta</DialogDescription>
        </DialogHeader>

        {balance.isError && <ErrorState error={balance.error} onRetry={() => void balance.refetch()} />}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4">
          <Summary label="Total Cargos" value={formatMoney(totals.total_charges, currency)} tone="text-white" />
          <Summary label="Total Pagado" value={formatMoney(totals.total_paid, currency)} tone="text-emerald-400" />
          <Summary label="Saldo Pendiente" value={formatMoney(totals.pending_balance, currency)} tone={Number(totals.pending_balance) > 0 ? 'text-red-400' : 'text-emerald-400'} />
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-semibold text-white/70 mb-3">Historial de Transacciones</h4>
          {transactions.isPending ? (
            <LoadingState label="Cargando transacciones…" />
          ) : transactions.isError ? (
            <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
          ) : history.length === 0 ? (
            <div className="text-center py-4 text-white/50">No hay transacciones registradas</div>
          ) : (
            <ul className="max-h-[300px] overflow-y-auto space-y-2">
              {history.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-white/40 shrink-0" aria-hidden="true" />
                      <p className="text-sm text-white truncate">{tx.description}</p>
                    </div>
                    <p className="text-xs text-white/50 mt-1">{new Date(tx.transaction_date).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold ${tx.is_income ? 'text-emerald-400' : 'text-white'}`}>
                      {tx.is_income ? '+' : '-'}
                      {formatMoney(tx.amount, currency)}
                    </p>
                    <TransactionStatusBadge status={tx.status} />
                  </div>
                  <TransactionActions leagueId={leagueId} transaction={tx} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
          <Button variant="outline" onClick={onClose} className="bg-transparent border-white/20 text-white hover:bg-white/10">
            Cerrar
          </Button>
          <Button onClick={() => downloadStatement(team.team_name, history)} disabled={history.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Receipt className="w-4 h-4 mr-2" aria-hidden="true" />
            Generar Estado de Cuenta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
