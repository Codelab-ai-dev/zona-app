import { Receipt } from 'lucide-react'

import { ErrorState, LoadingState } from '@/components/states'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { useTeamBalance, useTeamTransactions } from '../api'
import { formatMoney } from '../money'
import type { TeamBalance } from '../types'
import { TransactionStatusBadge } from './finance-status-badge'
import { TransactionActions } from './transaction-actions'
import { transactionTypeLabel } from './transaction-types'

function Summary({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
      <p className="text-xs text-white/50">{label}</p>
      <p className={`text-base sm:text-lg font-bold ${tone}`}>{value}</p>
    </div>
  )
}

/** A team's account statement: totals (GET .../balance) and its transactions, with the pay action. */
export function TeamBalanceDialog({ leagueId, team, onClose }: { leagueId: string; team: TeamBalance; onClose: () => void }) {
  const balance = useTeamBalance(leagueId, team.team_id)
  const transactions = useTeamTransactions(leagueId, team.team_id)
  // Show the row's numbers until the fresh balance arrives.
  const totals = balance.data ?? team

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-2xl bg-gray-900 border-white/20 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
              {team.team_logo ? (
                <img src={team.team_logo} alt="" className="w-10 h-10 object-cover" />
              ) : (
                <span className="text-lg text-white font-semibold" aria-hidden="true">
                  {team.team_name.charAt(0)}
                </span>
              )}
            </span>
            {team.team_name}
          </DialogTitle>
          <DialogDescription className="text-white/60">Estado de cuenta</DialogDescription>
        </DialogHeader>

        {balance.isError && <ErrorState error={balance.error} onRetry={() => void balance.refetch()} />}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Summary label="Total Cargos" value={formatMoney(totals.total_charges)} tone="text-white" />
          <Summary label="Total Pagado" value={formatMoney(totals.total_paid)} tone="text-emerald-400" />
          <Summary label="Saldo Pendiente" value={formatMoney(totals.pending_balance)} tone={Number(totals.pending_balance) > 0 ? 'text-red-400' : 'text-emerald-400'} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-3">Historial de Transacciones</h3>
          {transactions.isPending ? (
            <LoadingState label="Cargando transacciones…" />
          ) : transactions.isError ? (
            <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
          ) : transactions.data.data.length === 0 ? (
            <p className="text-center py-4 text-white/50">No hay transacciones registradas</p>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto space-y-2">
              {transactions.data.data.map((tx) => (
                <li key={tx.id} className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-white/40 shrink-0" aria-hidden="true" />
                        <p className="text-sm text-white truncate">{tx.description}</p>
                      </div>
                      <p className="text-xs text-white/50 mt-1">
                        {new Date(tx.transaction_date).toLocaleDateString('es-ES')} - {transactionTypeLabel(tx.transaction_type)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold ${tx.is_income ? 'text-emerald-400' : 'text-white'}`}>{formatMoney(tx.amount)}</p>
                      <p className="text-xs text-white/50 mb-1">Pagado {formatMoney(tx.amount_paid)}</p>
                      <TransactionStatusBadge status={tx.status} />
                    </div>
                  </div>
                  <TransactionActions leagueId={leagueId} transaction={tx} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
