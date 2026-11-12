import { FileText } from 'lucide-react'
import type { ReactNode } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTeamsByLeague } from '@/features/league-admin/teams/api'

import { useCurrency } from '../api'
import { formatMoney } from '../money'
import type { Transaction } from '../types'
import { TransactionStatusBadge } from './finance-status-badge'
import { paymentMethodLabel, transactionTypeLabel } from './transaction-types'

const day = (value?: string) => (value ? new Date(value).toLocaleDateString('es-ES') : undefined)

function Row({ label, children }: { label: string; children?: ReactNode }) {
  if (children === undefined || children === null || children === '') return null
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-white/60 shrink-0">{label}</dt>
      <dd className="text-white text-right break-words min-w-0">{children}</dd>
    </div>
  )
}

/** "Ver Detalles": everything the API knows about one transaction, including due date, payment and receipt data. */
export function TransactionDetailDialog({ leagueId, transaction: tx, onClose }: { leagueId: string; transaction: Transaction; onClose: () => void }) {
  const currency = useCurrency(leagueId)
  const teams = useTeamsByLeague(leagueId)
  const teamName = (teams.data?.data ?? []).find((t) => t.id === tx.team_id)?.name

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-gray-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            Detalle de la transacción
          </DialogTitle>
          <DialogDescription className="text-white/60">{tx.description}</DialogDescription>
        </DialogHeader>

        <dl className="space-y-2 p-4 bg-white/5 rounded-lg border border-white/10">
          <Row label="Estado">
            <TransactionStatusBadge status={tx.status} />
          </Row>
          <Row label="Tipo">{transactionTypeLabel(tx.transaction_type)}</Row>
          <Row label="Equipo">{teamName}</Row>
          <Row label="Monto">
            {tx.is_income ? '+' : '-'}
            {formatMoney(tx.amount, currency)}
          </Row>
          <Row label="Pagado">{formatMoney(tx.amount_paid, currency)}</Row>
          <Row label="Fecha">{day(tx.transaction_date)}</Row>
          <Row label="Vencimiento">{day(tx.due_date)}</Row>
          <Row label="Fecha de pago">{day(tx.paid_at)}</Row>
          <Row label="Método de pago">{tx.payment_method ? paymentMethodLabel(tx.payment_method) : undefined}</Row>
          <Row label="Referencia">{tx.payment_reference}</Row>
          <Row label="Recibo">{tx.receipt_number}</Row>
          <Row label="Origen">{tx.auto_generated ? 'Generada automáticamente' : undefined}</Row>
          <Row label="Notas">{tx.notes}</Row>
          <Row label="Cancelada">{day(tx.cancelled_at)}</Row>
          <Row label="Motivo">{tx.cancellation_reason}</Row>
        </dl>
      </DialogContent>
    </Dialog>
  )
}
