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
      <DialogContent className="max-w-[95vw] md:max-w-lg bg-slate-900 border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg font-bold text-white">Registrar pago</DialogTitle>
          <DialogDescription className="text-gray-400 text-xs md:text-sm">{transaction.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="pay-amount" className="text-[10px] md:text-xs text-gray-400">Monto (MXN)</Label>
            <Input
              className="h-10 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
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
              <p id="pay-amount-error" className="text-xs text-red-400">
                {errors.amount}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-method" className="text-[10px] md:text-xs text-gray-400">Método de pago</Label>
            <Select value={method} onValueChange={setMethod} disabled={pay.isPending}>
              <SelectTrigger
                id="pay-method" className="h-10 bg-slate-800/50 border-white/10 text-white text-sm"
                aria-invalid={!!errors.payment_method}
                aria-describedby={errors.payment_method ? 'pay-method-error' : undefined}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.payment_method && (
              <p id="pay-method-error" className="text-xs text-red-400">
                {errors.payment_method}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-reference" className="text-[10px] md:text-xs text-gray-400">Referencia (opcional)</Label>
            <Input
              className="h-10 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm"
              id="pay-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={pay.isPending}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pay.isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white" disabled={pay.isPending}>
              {pay.isPending ? 'Guardando…' : 'Registrar pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
