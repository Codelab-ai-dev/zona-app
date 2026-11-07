import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { useCancelTransaction, useWaiveTransaction } from '../api'
import type { Transaction } from '../types'
import { PayDialog } from './pay-dialog'
import { ReasonDialog } from './reason-dialog'
import { openStatuses } from './transaction-types'

type Action = 'pay' | 'cancel' | 'waive' | null

/** Row actions of the finance table: pay, cancel (with reason) and waive (with reason). */
export function TransactionActions({ leagueId, transaction }: { leagueId: string; transaction: Transaction }) {
  const [action, setAction] = useState<Action>(null)
  const cancel = useCancelTransaction(leagueId, transaction.id)
  const waive = useWaiveTransaction(leagueId, transaction.id)

  if (!openStatuses.includes(transaction.status)) return null
  const close = () => setAction(null)

  return (
    <>
      <div className="flex justify-end gap-1">
        <Button variant="outline" size="sm" onClick={() => setAction('pay')} aria-label={`Registrar pago de ${transaction.description}`}>
          Pagar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setAction('waive')} aria-label={`Condonar ${transaction.description}`}>
          Condonar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setAction('cancel')} aria-label={`Cancelar ${transaction.description}`}>
          Cancelar
        </Button>
      </div>

      {action === 'pay' && <PayDialog leagueId={leagueId} transaction={transaction} onClose={close} />}
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
