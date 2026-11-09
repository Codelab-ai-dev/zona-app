import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTeamsByLeague } from '@/features/public/api'
import { ApiError } from '@/lib/api/client'

import { useCreateTransaction, useFinanceConfig } from '../api'
import { validateAmount } from '../money'
import { transactionTypes, typeSections } from './transaction-types'

const field = 'bg-white/10 border-white/20 text-white placeholder:text-white/40'
const trigger = 'bg-white/10 border-white/20 text-white'

/** Local YYYY-MM-DD, `days` from today. */
function dateIn(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-xs text-red-400">
      {message}
    </p>
  ) : null
}

/** "Nueva Transacción": a charge, fine, expense or income. Picking a type prefills description and amount from the league config. */
export function NewTransactionDialog({ leagueId, onClose }: { leagueId: string; onClose: () => void }) {
  const config = useFinanceConfig(leagueId).data
  const currency = config?.currency || 'MXN'
  const [type, setType] = useState('')
  const [teamId, setTeamId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(() => dateIn(config?.payment_due_days || 7))
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const teams = useTeamsByLeague(leagueId)
  const create = useCreateTransaction(leagueId)
  const option = transactionTypes.find((t) => t.value === type)
  const isCharge = Boolean(option) && !option?.isIncome

  const pickType = (value: string) => {
    setType(value)
    const prefill = transactionTypes.find((t) => t.value === value)?.prefill
    if (!prefill) return
    setDescription(prefill.description)
    const configured = config?.[prefill.configKey as keyof typeof config]
    if (configured !== undefined && Number(configured) > 0) setAmount(String(configured))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found: Record<string, string> = {}
    if (!option) found.transaction_type = 'Selecciona un tipo'
    if (option?.needsTeam && !teamId) found.team_id = 'Selecciona un equipo'
    if (description.trim().length < 3) found.description = 'La descripción debe tener al menos 3 caracteres'
    const parsed = validateAmount(amount)
    if (!parsed.ok) found.amount = parsed.error
    if (!option || !parsed.ok || Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    setErrors({})

    try {
      await create.mutateAsync({
        transaction_type: option.value,
        description: description.trim(),
        amount: parsed.value,
        is_income: option.isIncome,
        ...(teamId ? { team_id: teamId } : {}),
        ...(isCharge && dueDate ? { due_date: dueDate } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
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
            <Plus className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            Nueva Transacción
          </DialogTitle>
          <DialogDescription className="text-white/60">Registra un cargo, multa o pago</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="tx-team" className="text-white/90">Equipo{option && !option.needsTeam ? ' (opcional)' : ''}</Label>
            <Select value={teamId} onValueChange={setTeamId} disabled={create.isPending}>
              <SelectTrigger id="tx-team" className={trigger} aria-invalid={!!errors.team_id} aria-describedby={errors.team_id ? 'tx-team-error' : undefined}>
                <SelectValue placeholder="Seleccionar equipo" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20 text-white max-h-60">
                {(teams.data?.data ?? []).map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="tx-team-error" message={errors.team_id} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-type" className="text-white/90">Tipo de Transacción</Label>
            <Select value={type} onValueChange={pickType} disabled={create.isPending}>
              <SelectTrigger id="tx-type" className={trigger} aria-invalid={!!errors.transaction_type} aria-describedby={errors.transaction_type ? 'tx-type-error' : undefined}>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20 text-white max-h-72">
                {typeSections.map((section) => (
                  <SelectGroup key={section}>
                    <SelectLabel className="text-xs font-semibold text-white/50">{section}</SelectLabel>
                    {transactionTypes
                      .filter((t) => t.section === section)
                      .map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="tx-type-error" message={errors.transaction_type} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-description" className="text-white/90">Descripción</Label>
            <Input
              id="tx-description"
              className={field}
              placeholder="Describe la transacción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'tx-description-error' : undefined}
              disabled={create.isPending}
            />
            <FieldError id="tx-description-error" message={errors.description} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-amount" className="text-white/90">Monto ({currency})</Label>
            <Input
              id="tx-amount"
              className={field}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'tx-amount-error' : undefined}
              disabled={create.isPending}
            />
            <FieldError id="tx-amount-error" message={errors.amount} />
          </div>

          {isCharge && (
            <div className="space-y-2">
              <Label htmlFor="tx-due" className="text-white/90">Fecha de Vencimiento</Label>
              <Input id="tx-due" className={field} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-describedby="tx-due-hint tx-due-error" aria-invalid={!!errors.due_date} disabled={create.isPending} />
              <p id="tx-due-hint" className="text-white/50 text-xs">Fecha límite para el pago</p>
              <FieldError id="tx-due-error" message={errors.due_date} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tx-notes" className="text-white/90">Notas (opcional)</Label>
            <Textarea id="tx-notes" className={`${field} resize-none`} placeholder="Notas adicionales..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={create.isPending} />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending} className="bg-transparent border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {create.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              {create.isPending ? 'Guardando…' : 'Crear Transacción'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
