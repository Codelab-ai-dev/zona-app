import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'

import { useRegisterPayment } from '../api'
import { remainingAmount, validateAmount } from '../money'
import type { Transaction } from '../types'
import { paymentMethods } from './transaction-types'

export function PayDialog({
  leagueId,
  transaction,
  onClose,
}: {
  leagueId: string
  transaction: Transaction
  onClose: () => void
}) {
  const [amount, setAmount] = useState(remainingAmount(transaction.amount, transaction.amount_paid))
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const pay = useRegisterPayment(leagueId, transaction.id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = validateAmount(amount)
    if (!parsed.ok) {
      setErrors({ amount: parsed.error })
      return
    }
    setErrors({})
    try {
      await pay.mutateAsync({
        amount: parsed.value,
        payment_method: method,
        ...(reference.trim() ? { payment_reference: reference.trim() } : {}),
      })
      onClose()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) setErrors(err.fields)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>{transaction.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Monto (MXN)</Label>
            <Input
              id="pay-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'pay-amount-error' : undefined}
              disabled={pay.isPending}
            />
            {errors.amount && (
              <p id="pay-amount-error" className="text-xs text-destructive">
                {errors.amount}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-method">Método de pago</Label>
            <Select value={method} onValueChange={setMethod} disabled={pay.isPending}>
              <SelectTrigger
                id="pay-method"
                aria-invalid={!!errors.payment_method}
                aria-describedby={errors.payment_method ? 'pay-method-error' : undefined}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.payment_method && (
              <p id="pay-method-error" className="text-xs text-destructive">
                {errors.payment_method}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-reference">Referencia (opcional)</Label>
            <Input
              id="pay-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={pay.isPending}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pay.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pay.isPending}>
              {pay.isPending ? 'Guardando…' : 'Registrar pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
