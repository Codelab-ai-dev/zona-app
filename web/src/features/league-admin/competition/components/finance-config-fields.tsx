import type { ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export const moneyKeys = [
  'team_registration_fee',
  'player_registration_fee',
  'late_registration_surcharge',
  'yellow_card_fine',
  'red_card_fine',
  'double_yellow_fine',
  'absence_fine',
  'late_arrival_fine',
  'misconduct_fine',
  'uniform_violation_fine',
  'referee_fee_per_match',
  'assistant_referee_fee',
  'field_rental_per_match',
] as const
export type MoneyKey = (typeof moneyKeys)[number]

export const flagKeys = ['auto_generate_fines', 'auto_generate_referee_fees', 'notify_on_new_charge', 'notify_on_overdue'] as const
export type FlagKey = (typeof flagKeys)[number]

/** Which tab holds each field, so a validation error can bring the user to it. */
export const tabOfField: Record<string, 'fees' | 'fines' | 'settings'> = {
  team_registration_fee: 'fees',
  player_registration_fee: 'fees',
  late_registration_surcharge: 'fees',
  referee_fee_per_match: 'fees',
  assistant_referee_fee: 'fees',
  field_rental_per_match: 'fees',
  yellow_card_fine: 'fines',
  red_card_fine: 'fines',
  double_yellow_fine: 'fines',
  absence_fine: 'fines',
  late_arrival_fine: 'fines',
  misconduct_fine: 'fines',
  uniform_violation_fine: 'fines',
}

const fieldClass = 'bg-white/10 border-white/20 text-white'

interface FieldProps {
  id: string
  label: ReactNode
  value: string
  error?: string
  hint?: string
  disabled?: boolean
  onChange: (value: string) => void
  type?: 'text' | 'number'
  min?: string
  max?: string
}

/** Labelled input with its error and hint wired through aria-describedby. */
export function ConfigField({ id, label, value, error, hint, disabled, onChange, type = 'text', min, max }: FieldProps) {
  const described = [error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ')
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white/90 flex items-center gap-2">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        inputMode={type === 'text' ? 'decimal' : undefined}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={described || undefined}
        disabled={disabled}
        className={fieldClass}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-white/50 text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

/** Switch row with title and description, like the "Automatización" block of the original. */
export function ConfigSwitch({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
      <div>
        <Label htmlFor={id} className="text-white/90 cursor-pointer">
          {label}
        </Label>
        <p id={`${id}-hint`} className="text-white/50 text-xs">
          {hint}
        </p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-describedby={`${id}-hint`} />
    </div>
  )
}

export const cardDot = (color: string) => <span className={`w-3 h-3 ${color} rounded-sm`} aria-hidden="true" />
