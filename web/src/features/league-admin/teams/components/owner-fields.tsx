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
    <fieldset className="border-t border-white/10 pt-3">
      <legend className="mb-3 text-xs font-medium text-white md:text-sm">Información del Propietario</legend>
      <div className="space-y-3">
        {loadError && <p role="status" className="text-[10px] text-yellow-400 md:text-xs">{loadError}</p>}
        <div className="grid grid-cols-2 gap-2">
          <FormField id="edit-owner-name" label="Nombre" placeholder="Juan Pérez" value={value.name} error={errors.owner_name} onChange={(e) => onChange('name', e.target.value)} />
          <FormField id="edit-owner-phone" type="tel" label="Teléfono" placeholder="+502 1234-5678" value={value.phone} error={errors.owner_phone} onChange={(e) => onChange('phone', e.target.value)} />
        </div>
        <FormField id="edit-owner-email" type="email" label="Email" placeholder="propietario@ejemplo.com" value={value.email} error={errors.owner_email} onChange={(e) => onChange('email', e.target.value)} />
        <p className="rounded bg-slate-800/30 p-2 text-[10px] text-gray-500">
          Los cambios actualizarán nombre, teléfono y email del propietario.
        </p>
      </div>
    </fieldset>
  )
}
