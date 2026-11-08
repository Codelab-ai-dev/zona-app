import { FormField } from './form-field'

export interface OwnerEdit {
  name: string
  phone: string
  email: string
}

interface Props {
  value: OwnerEdit
  errors: Record<string, string>
  onChange: (field: keyof OwnerEdit, value: string) => void
  /** Why the current values could not be loaded (fields start blank, blank = unchanged). */
  loadError?: string
}

/** Owner account fields of the edit dialog, prefilled from the owner's account. */
export function OwnerFields({ value, errors, onChange, loadError }: Props) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-white/10 p-3">
      <legend className="px-1 text-xs text-gray-300">Propietario del equipo</legend>
      {loadError && <p role="status" className="text-[10px] text-yellow-400 md:text-xs">{loadError}</p>}
      <FormField id="owner-name" label="Nombre del propietario" value={value.name} error={errors.owner_name} onChange={(e) => onChange('name', e.target.value)} />
      <FormField id="owner-phone" type="tel" label="Teléfono del propietario" value={value.phone} error={errors.owner_phone} onChange={(e) => onChange('phone', e.target.value)} />
      <FormField id="owner-email" type="email" label="Email del propietario" value={value.email} error={errors.owner_email} onChange={(e) => onChange('email', e.target.value)} />
    </fieldset>
  )
}
