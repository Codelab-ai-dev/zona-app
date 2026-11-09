import { CreditCard, FileText, HandCoins, MoreHorizontal, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { useCancelTransaction, useWaiveTransaction } from '../api'
import type { Transaction } from '../types'
import { PayDialog } from './pay-dialog'
import { ReasonDialog } from './reason-dialog'
import { TransactionDetailDialog } from './transaction-detail-dialog'
import { openStatuses } from './transaction-types'

type Action = 'pay' | 'detail' | 'cancel' | 'waive' | null

/** Row menu of the finance table: register payment, details, waive and cancel (the last two with a reason). */
export function TransactionActions({ leagueId, transaction }: { leagueId: string; transaction: Transaction }) {
  const [action, setAction] = useState<Action>(null)
  const cancel = useCancelTransaction(leagueId, transaction.id)
  const waive = useWaiveTransaction(leagueId, transaction.id)

  const isOpen = openStatuses.includes(transaction.status)
  const close = () => setAction(null)

  return (
    <>
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Acciones de ${transaction.description}`} className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOpen && !transaction.is_income && (
              <DropdownMenuItem onSelect={() => setAction('pay')}>
                <CreditCard className="w-4 h-4 mr-2" aria-hidden="true" />
                Registrar Pago
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => setAction('detail')}>
              <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
              Ver Detalles
            </DropdownMenuItem>
            {isOpen && (
              <DropdownMenuItem onSelect={() => setAction('waive')}>
                <HandCoins className="w-4 h-4 mr-2" aria-hidden="true" />
                Condonar
              </DropdownMenuItem>
            )}
            {isOpen && (
              <DropdownMenuItem onSelect={() => setAction('cancel')} className="text-red-400">
                <X className="w-4 h-4 mr-2" aria-hidden="true" />
                Cancelar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {action === 'pay' && <PayDialog leagueId={leagueId} transaction={transaction} onClose={close} />}
      {action === 'detail' && <TransactionDetailDialog leagueId={leagueId} transaction={transaction} onClose={close} />}
      {action === 'cancel' && (
        <ReasonDialog
          title="Cancelar transacción"
          description="La transacción dejará de contar como pendiente. Indica el motivo."
          confirmLabel="Cancelar transacción"
          pendingLabel="Cancelando…"
          isPending={cancel.isPending}
          onConfirm={(reason) => cancel.mutateAsync({ reason })}
          onClose={close}
        />
      )}
      {action === 'waive' && (
        <ReasonDialog
          title="Condonar transacción"
          description="Se perdonará el saldo pendiente de esta transacción. Indica el motivo."
          confirmLabel="Condonar"
          pendingLabel="Condonando…"
          isPending={waive.isPending}
          onConfirm={(reason) => waive.mutateAsync({ reason })}
          onClose={close}
        />
      )}
    </>
  )
}
