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
import { useTeamsByLeague } from '@/features/public/api'
import { ApiError } from '@/lib/api/client'

import { useCreateTransaction } from '../api'
import { validateAmount } from '../money'
import { transactionTypes } from './transaction-types'

const groupLabels = { charge: 'Cargos y multas', expense: 'Gastos', income: 'Ingresos' } as const

/** "Nuevo movimiento": creates a charge, fine, expense or income for the league. */
export function NewTransactionDialog({ leagueId, onClose }: { leagueId: string; onClose: () => void }) {
  const [type, setType] = useState('')
  const [teamId, setTeamId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const teams = useTeamsByLeague(leagueId)
  const create = useCreateTransaction(leagueId)
  const option = transactionTypes.find((t) => t.value === type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found: Record<string, string> = {}
    if (!option) found.transaction_type = 'Selecciona un tipo'
    if (option?.needsTeam && !teamId) found.team_id = 'Selecciona un equipo'
    if (!description.trim()) found.description = 'La descripción es obligatoria'
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
        is_income: option.group === 'income',
        ...(teamId ? { team_id: teamId } : {}),
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
          <DialogTitle>Nuevo movimiento</DialogTitle>
          <DialogDescription>Registra un cargo, multa, gasto o ingreso de la liga</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="tx-type">Tipo</Label>
            <Select value={type} onValueChange={setType} disabled={create.isPending}>
              <SelectTrigger
                id="tx-type"
                aria-invalid={!!errors.transaction_type}
                aria-describedby={errors.transaction_type ? 'tx-type-error' : undefined}
              >
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {transactionTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {groupLabels[t.group]}: {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.transaction_type && (
              <p id="tx-type-error" className="text-xs text-destructive">
                {errors.transaction_type}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-team">Equipo{option?.needsTeam ? '' : ' (opcional)'}</Label>
            <Select value={teamId} onValueChange={setTeamId} disabled={create.isPending}>
              <SelectTrigger
                id="tx-team"
                aria-invalid={!!errors.team_id}
                aria-describedby={errors.team_id ? 'tx-team-error' : undefined}
              >
                <SelectValue placeholder="Selecciona un equipo" />
              </SelectTrigger>
              <SelectContent>
                {(teams.data?.data ?? []).map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.team_id && (
              <p id="tx-team-error" className="text-xs text-destructive">
                {errors.team_id}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-amount">Monto (MXN)</Label>
            <Input
              id="tx-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'tx-amount-error' : undefined}
              disabled={create.isPending}
            />
            {errors.amount && (
              <p id="tx-amount-error" className="text-xs text-destructive">
                {errors.amount}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-description">Descripción</Label>
            <Input
              id="tx-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'tx-description-error' : undefined}
              disabled={create.isPending}
            />
            {errors.description && (
              <p id="tx-description-error" className="text-xs text-destructive">
                {errors.description}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
