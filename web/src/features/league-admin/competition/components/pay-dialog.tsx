import { CheckCircle, CreditCard, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTeamsByLeague } from '@/features/league-admin/teams/api'
import { ApiError } from '@/lib/api/client'

import { useCurrency, useRegisterPayment } from '../api'
import { formatMoney, fromCents, remainingAmount, toCents, validateAmount } from '../money'
import type { Transaction } from '../types'
import { paymentMethods } from './transaction-types'

const field = 'bg-white/10 border-white/20 text-white placeholder:text-white/40'

function Line({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-white/60">{label}</span>
      <span className={`${tone} font-medium`}>{value}</span>
    </div>
  )
}

/** "Registrar Pago": full or partial payment of one charge (POST .../pay). The amount never exceeds what is pending. */
export function PayDialog({ leagueId, transaction, onClose }: { leagueId: string; transaction: Transaction; onClose: () => void }) {
  const pending = remainingAmount(transaction.amount, transaction.amount_paid)
  const [amount, setAmount] = useState(pending)
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const currency = useCurrency(leagueId)
  const teams = useTeamsByLeague(leagueId)
  const pay = useRegisterPayment(leagueId, transaction.id)
  const teamName = (teams.data?.data ?? []).find((t) => t.id === transaction.team_id)?.name

  const entered = validateAmount(amount)
  const pendingCents = toCents(pending) ?? 0
  const enteredCents = entered.ok ? (toCents(entered.value) ?? 0) : 0
  const isFull = entered.ok && enteredCents >= pendingCents

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entered.ok) {
      setErrors({ amount: entered.error })
      return
    }
    setErrors({})
    try {
      await pay.mutateAsync({
        // Don't overpay: the original capped the payment to the pending amount.
        amount: enteredCents > pendingCents ? fromCents(pendingCents) : entered.value,
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-gray-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription className="text-white/60">Registrar pago para: {transaction.description}</DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-2">
          <Line label="Equipo:" value={teamName || 'Sin equipo'} />
          <Line label="Monto Total:" value={formatMoney(transaction.amount, currency)} />
          <Line label="Ya Pagado:" value={formatMoney(transaction.amount_paid, currency)} tone="text-emerald-400" />
          <div className="flex justify-between text-sm pt-2 border-t border-white/10">
            <span className="text-white/80 font-medium">Pendiente:</span>
            <span className="text-white font-bold">{formatMoney(pending, currency)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="pay-amount" className="text-white/90">Monto a Pagar ({currency})</Label>
            <Input
              id="pay-amount"
              className={field}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'pay-amount-error pay-amount-hint' : 'pay-amount-hint'}
              disabled={pay.isPending}
            />
            {entered.ok && (
              <p id="pay-amount-hint" className="text-white/50 text-xs flex items-center gap-2">
                {isFull ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-400">Pago completo - se marcará como pagado</span>
                  </>
                ) : (
                  <>Pago parcial - quedarán {formatMoney(fromCents(pendingCents - enteredCents), currency)} pendientes</>
                )}
              </p>
            )}
            {!entered.ok && <span id="pay-amount-hint" className="sr-only">Monto pendiente {formatMoney(pending, currency)}</span>}
            {errors.amount && (
              <p id="pay-amount-error" className="text-xs text-red-400">
                {errors.amount}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-method" className="text-white/90">Método de Pago</Label>
            <Select value={method} onValueChange={setMethod} disabled={pay.isPending}>
              <SelectTrigger id="pay-method" className="bg-white/10 border-white/20 text-white" aria-invalid={!!errors.payment_method} aria-describedby={errors.payment_method ? 'pay-method-error' : undefined}>
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20 text-white max-h-60">
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
            <Label htmlFor="pay-reference" className="text-white/90">Referencia (opcional)</Label>
            <Input id="pay-reference" className={field} placeholder="Ej: Número de transferencia, folio..." value={reference} onChange={(e) => setReference(e.target.value)} aria-describedby="pay-reference-hint" disabled={pay.isPending} />
            <p id="pay-reference-hint" className="text-white/50 text-xs">Número de referencia, folio o comprobante</p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={pay.isPending} className="bg-transparent border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button type="submit" disabled={pay.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {pay.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              {pay.isPending ? 'Guardando…' : 'Registrar Pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
