import { Settings } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import { useUpdateFinanceConfig } from '../api'
import { validateAmount } from '../money'
import type { FinanceConfig } from '../types'

type MoneyKey =
  | 'team_registration_fee' | 'player_registration_fee' | 'late_registration_surcharge'
  | 'yellow_card_fine' | 'red_card_fine' | 'double_yellow_fine' | 'absence_fine' | 'late_arrival_fine'
  | 'misconduct_fine' | 'uniform_violation_fine' | 'referee_fee_per_match' | 'assistant_referee_fee' | 'field_rental_per_match'

const groups: { title: string; fields: { key: MoneyKey; label: string }[] }[] = [
  {
    title: 'Cuotas de inscripción',
    fields: [
      { key: 'team_registration_fee', label: 'Inscripción de equipo' },
      { key: 'player_registration_fee', label: 'Inscripción de jugador' },
      { key: 'late_registration_surcharge', label: 'Recargo por inscripción tardía' },
    ],
  },
  {
    title: 'Multas',
    fields: [
      { key: 'yellow_card_fine', label: 'Tarjeta amarilla' },
      { key: 'red_card_fine', label: 'Tarjeta roja' },
      { key: 'double_yellow_fine', label: 'Doble amarilla' },
      { key: 'absence_fine', label: 'Incomparecencia' },
      { key: 'late_arrival_fine', label: 'Llegada tarde' },
      { key: 'misconduct_fine', label: 'Mala conducta' },
      { key: 'uniform_violation_fine', label: 'Uniforme' },
    ],
  },
  {
    title: 'Costos por partido',
    fields: [
      { key: 'referee_fee_per_match', label: 'Árbitro central' },
      { key: 'assistant_referee_fee', label: 'Árbitro asistente' },
      { key: 'field_rental_per_match', label: 'Renta de cancha' },
    ],
  },
]

const toggles: { key: 'auto_generate_fines' | 'auto_generate_referee_fees' | 'notify_on_new_charge' | 'notify_on_overdue'; label: string }[] = [
  { key: 'auto_generate_fines', label: 'Generar multas automáticamente' },
  { key: 'auto_generate_referee_fees', label: 'Generar honorarios de árbitros' },
  { key: 'notify_on_new_charge', label: 'Notificar nuevos cargos' },
  { key: 'notify_on_overdue', label: 'Notificar pagos vencidos' },
]

const labelClass = 'text-[10px] md:text-xs text-gray-400'
const inputClass = 'h-9 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm'

export function FinanceConfigDialog({ leagueId, config, onClose }: { leagueId: string; config?: FinanceConfig; onClose: () => void }) {
  const [money, setMoney] = useState<Record<MoneyKey, string>>(() =>
    Object.fromEntries(groups.flatMap((g) => g.fields.map((f) => [f.key, config?.[f.key] ?? '0.00']))) as Record<MoneyKey, string>,
  )
  const [flags, setFlags] = useState({
    auto_generate_fines: config?.auto_generate_fines ?? false,
    auto_generate_referee_fees: config?.auto_generate_referee_fees ?? false,
    notify_on_new_charge: config?.notify_on_new_charge ?? true,
    notify_on_overdue: config?.notify_on_overdue ?? true,
  })
  const [dueDays, setDueDays] = useState(String(config?.payment_due_days ?? 7))
  const [graceDays, setGraceDays] = useState(String(config?.overdue_grace_days ?? 3))
  const [instructions, setInstructions] = useState(config?.payment_instructions ?? '')
  const [bank, setBank] = useState(config?.bank_account_info ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const update = useUpdateFinanceConfig(leagueId)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    const amounts: Record<string, string> = {}
    for (const [key, value] of Object.entries(money)) {
      const parsed = value.trim() === '0' ? { ok: true as const, value: '0.00' } : validateAmount(value)
      if (parsed.ok) amounts[key] = parsed.value
      else next[key] = parsed.error
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return
    try {
      await update.mutateAsync({
        name: config?.name || 'Configuración financiera',
        currency: config?.currency || 'MXN',
        ...amounts,
        ...flags,
        payment_due_days: Number(dueDays) || 0,
        overdue_grace_days: Number(graceDays) || 0,
        payment_instructions: instructions,
        bank_account_info: bank,
      })
      onClose()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) setErrors(err.fields)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-2xl bg-slate-900 border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg font-bold text-white">
            <Settings className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            Configuración Financiera
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs md:text-sm">Montos por defecto de cuotas, multas y costos por partido (MXN)</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          {groups.map((group) => (
            <fieldset key={group.title} className="space-y-3">
              <legend className="text-sm font-medium text-white mb-2">{group.title}</legend>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {group.fields.map((f) => (
                  <div key={f.key}>
                    <Label htmlFor={`cfg-${f.key}`} className={labelClass}>{f.label}</Label>
                    <Input
                      id={`cfg-${f.key}`}
                      inputMode="decimal"
                      value={money[f.key]}
                      onChange={(e) => setMoney({ ...money, [f.key]: e.target.value })}
                      aria-invalid={!!errors[f.key]}
                      aria-describedby={errors[f.key] ? `cfg-${f.key}-error` : undefined}
                      disabled={update.isPending}
                      className={inputClass}
                    />
                    {errors[f.key] && <p id={`cfg-${f.key}-error`} className="text-xs text-red-400 mt-1">{errors[f.key]}</p>}
                  </div>
                ))}
              </div>
            </fieldset>
          ))}

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-white mb-2">Pagos</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cfg-due" className={labelClass}>Días para pagar</Label>
                <Input id="cfg-due" type="number" min="0" value={dueDays} onChange={(e) => setDueDays(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="cfg-grace" className={labelClass}>Días de gracia antes de vencer</Label>
                <Input id="cfg-grace" type="number" min="0" value={graceDays} onChange={(e) => setGraceDays(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <Label htmlFor="cfg-instructions" className={labelClass}>Instrucciones de pago</Label>
              <Textarea id="cfg-instructions" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="bg-slate-800/50 border-white/10 text-white text-sm" />
            </div>
            <div>
              <Label htmlFor="cfg-bank" className={labelClass}>Datos bancarios</Label>
              <Textarea id="cfg-bank" rows={2} value={bank} onChange={(e) => setBank(e.target.value)} className="bg-slate-800/50 border-white/10 text-white text-sm" />
            </div>
          </fieldset>

          <div className="space-y-2">
            {toggles.map((t) => (
              <div key={t.key} className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/30">
                <Switch id={`cfg-${t.key}`} checked={flags[t.key]} onCheckedChange={(c) => setFlags({ ...flags, [t.key]: c })} />
                <Label htmlFor={`cfg-${t.key}`} className="cursor-pointer text-gray-300 text-xs md:text-sm">{t.label}</Label>
              </div>
            ))}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={onClose} disabled={update.isPending} className="text-gray-400 hover:text-white hover:bg-slate-800/50">
              Cancelar
            </Button>
            <Button type="submit" disabled={update.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {update.isPending ? 'Guardando…' : 'Guardar Configuración'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
