import { AlertTriangle, Bell, DollarSign, Loader2, Settings } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import { useUpdateFinanceConfig } from '../api'
import { validateNonNegativeAmount } from '../money'
import type { FinanceConfig } from '../types'
import { cardDot, ConfigField, ConfigSwitch, flagKeys, moneyKeys, tabOfField, type FlagKey, type MoneyKey } from './finance-config-fields'

// Defaults the original form offered when the league had no configuration yet.
const defaultAmounts: Record<MoneyKey, string> = {
  team_registration_fee: '0',
  player_registration_fee: '0',
  late_registration_surcharge: '0',
  yellow_card_fine: '50',
  red_card_fine: '150',
  double_yellow_fine: '100',
  absence_fine: '500',
  late_arrival_fine: '100',
  misconduct_fine: '200',
  uniform_violation_fine: '0',
  referee_fee_per_match: '300',
  assistant_referee_fee: '150',
  field_rental_per_match: '0',
}
const defaultFlags: Record<FlagKey, boolean> = {
  auto_generate_fines: true,
  auto_generate_referee_fees: false,
  notify_on_new_charge: true,
  notify_on_overdue: true,
}

const currencies: Array<[string, string]> = [
  ['MXN', 'Peso Mexicano'],
  ['USD', 'Dólar'],
  ['EUR', 'Euro'],
  ['COP', 'Peso Colombiano'],
  ['ARS', 'Peso Argentino'],
  ['CLP', 'Peso Chileno'],
  ['PEN', 'Sol Peruano'],
]

type Tab = 'fees' | 'fines' | 'settings'
const tabTrigger = 'flex-1 data-[state=active]:bg-white/20'

/** "Configuración Financiera": fees, fines and options of the league (PUT .../finance/config). */
export function FinanceConfigDialog({ leagueId, config, onClose }: { leagueId: string; config?: FinanceConfig; onClose: () => void }) {
  const [currency, setCurrency] = useState(config?.currency || 'MXN')
  const [tab, setTab] = useState<Tab>('fees')
  // The API sends the amounts as JSON numbers or strings depending on the column: always edit them as text.
  const [money, setMoney] = useState<Record<MoneyKey, string>>(() =>
    Object.fromEntries(moneyKeys.map((k) => [k, config?.[k] !== undefined ? String(config[k]) : defaultAmounts[k]])) as Record<MoneyKey, string>,
  )
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>(() =>
    Object.fromEntries(flagKeys.map((k) => [k, config?.[k] ?? defaultFlags[k]])) as Record<FlagKey, boolean>,
  )
  const [dueDays, setDueDays] = useState(String(config?.payment_due_days ?? 7))
  const [graceDays, setGraceDays] = useState(String(config?.overdue_grace_days ?? 3))
  const [instructions, setInstructions] = useState(config?.payment_instructions ?? '')
  const [bank, setBank] = useState(config?.bank_account_info ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const update = useUpdateFinanceConfig(leagueId)
  const isEditing = Boolean(config)

  const showErrors = (found: Record<string, string>) => {
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) setTab(tabOfField[first] ?? 'settings')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found: Record<string, string> = {}
    const amounts: Partial<Record<MoneyKey, string>> = {}
    for (const key of moneyKeys) {
      const parsed = validateNonNegativeAmount(money[key])
      if (parsed.ok) amounts[key] = parsed.value
      else found[key] = parsed.error
    }
    const due = Number(dueDays)
    if (dueDays.trim() === '' || !Number.isInteger(due) || due < 0 || due > 90) found.payment_due_days = 'Debe estar entre 0 y 90'
    const grace = Number(graceDays)
    if (graceDays.trim() === '' || !Number.isInteger(grace) || grace < 0 || grace > 30) found.overdue_grace_days = 'Debe estar entre 0 y 30'
    if (Object.keys(found).length > 0) {
      showErrors(found)
      return
    }
    setErrors({})
    try {
      await update.mutateAsync({
        currency,
        ...amounts,
        ...flags,
        payment_due_days: due,
        overdue_grace_days: grace,
        payment_instructions: instructions.trim(),
        bank_account_info: bank.trim(),
      })
      onClose()
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) showErrors(err.fields)
    }
  }

  const field = (key: MoneyKey, label: React.ReactNode) => (
    <ConfigField
      key={key}
      id={`cfg-${key}`}
      label={label}
      value={money[key]}
      error={errors[key]}
      disabled={update.isPending}
      onChange={(value) => setMoney({ ...money, [key]: value })}
    />
  )
  const switchFor = (key: FlagKey, label: string, hint: string) => (
    <ConfigSwitch key={key} id={`cfg-${key}`} label={label} hint={hint} checked={flags[key]} onChange={(checked) => setFlags({ ...flags, [key]: checked })} />
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            Configuración Financiera
          </DialogTitle>
          <DialogDescription className="text-white/60">Define las tarifas, multas y opciones de tu liga</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6" noValidate>
          <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
            <TabsList className="w-full bg-white/10 border border-white/20">
              <TabsTrigger value="fees" className={tabTrigger}>
                <DollarSign className="w-4 h-4 mr-2" aria-hidden="true" />
                Cuotas
              </TabsTrigger>
              <TabsTrigger value="fines" className={tabTrigger}>
                <AlertTriangle className="w-4 h-4 mr-2" aria-hidden="true" />
                Multas
              </TabsTrigger>
              <TabsTrigger value="settings" className={tabTrigger}>
                <Bell className="w-4 h-4 mr-2" aria-hidden="true" />
                Opciones
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fees" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('team_registration_fee', `Inscripción Equipo (${currency})`)}
                {field('player_registration_fee', `Inscripción Jugador (${currency})`)}
                {field('referee_fee_per_match', `Arbitraje por Partido (${currency})`)}
                {field('field_rental_per_match', `Renta Cancha (${currency})`)}
                {field('assistant_referee_fee', `Árbitro Asistente (${currency})`)}
                {field('late_registration_surcharge', `Recargo Inscripción Tardía (${currency})`)}
              </div>
            </TabsContent>

            <TabsContent value="fines" className="space-y-4 mt-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-white/70">Multas por Tarjetas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {field('yellow_card_fine', <>{cardDot('bg-yellow-400')}Amarilla</>)}
                  {field('double_yellow_fine', <>{cardDot('bg-orange-400')}Doble Amarilla</>)}
                  {field('red_card_fine', <>{cardDot('bg-red-500')}Roja</>)}
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-medium text-white/70">Otras Multas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {field('absence_fine', 'Incomparecencia')}
                  {field('late_arrival_fine', 'Llegada Tarde')}
                  {field('misconduct_fine', 'Mala Conducta')}
                  {field('uniform_violation_fine', 'Uniforme')}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cfg-currency" className="text-white/90">Moneda</Label>
                  <Select value={currency} onValueChange={setCurrency} disabled={update.isPending}>
                    <SelectTrigger id="cfg-currency" className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20 text-white">
                      {currencies.map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {code} - {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.currency && <p className="text-xs text-red-400">{errors.currency}</p>}
                </div>
                <ConfigField
                  id="cfg-due"
                  type="number"
                  min="0"
                  max="90"
                  label="Días para Pago"
                  value={dueDays}
                  error={errors.payment_due_days}
                  hint="Días después del cargo para el vencimiento"
                  disabled={update.isPending}
                  onChange={setDueDays}
                />
                <ConfigField
                  id="cfg-grace"
                  type="number"
                  min="0"
                  max="30"
                  label="Días de Gracia"
                  value={graceDays}
                  error={errors.overdue_grace_days}
                  hint="Días extra antes de marcar un cargo como vencido"
                  disabled={update.isPending}
                  onChange={setGraceDays}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-instructions" className="text-white/90">Instrucciones de Pago</Label>
                <Textarea id="cfg-instructions" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="bg-white/10 border-white/20 text-white resize-none" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-bank" className="text-white/90">Datos Bancarios</Label>
                <Textarea id="cfg-bank" rows={2} value={bank} onChange={(e) => setBank(e.target.value)} className="bg-white/10 border-white/20 text-white resize-none" />
              </div>
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-medium text-white/70">Automatización</h4>
                {switchFor('auto_generate_fines', 'Generar multas automáticamente', 'Crea multas cuando se registran tarjetas en partidos')}
                {switchFor('auto_generate_referee_fees', 'Generar honorarios de árbitros', 'Crea el cargo de arbitraje al cerrar cada partido')}
                {switchFor('notify_on_new_charge', 'Notificar nuevos cargos', 'Envía notificación cuando se genera un nuevo cargo')}
                {switchFor('notify_on_overdue', 'Notificar pagos vencidos', 'Envía recordatorio cuando un pago se vence')}
              </div>
            </TabsContent>
          </Tabs>

          {Object.keys(errors).length > 0 && (
            <p role="alert" className="text-xs text-red-400">
              Revisa los campos marcados antes de guardar.
            </p>
          )}

          <DialogFooter className="pt-4 border-t border-white/10">
            <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending} className="bg-transparent border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
            <Button type="submit" disabled={update.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {update.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              {update.isPending ? 'Guardando…' : isEditing ? 'Guardar Cambios' : 'Crear Configuración'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
