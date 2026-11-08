import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { User } from '../types'

export interface AdminDraft {
  mode: 'existing' | 'new'
  existingId: string
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export const emptyAdminDraft: AdminDraft = {
  mode: 'new',
  existingId: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
}

interface LeagueAdminFieldsProps {
  value: AdminDraft
  onChange: (next: AdminDraft) => void
  /** Active league_admin users that can be picked. */
  admins: User[]
  /** Errors by field, keys prefixed with `admin_` (admin_existingId, admin_email…). */
  errors: Record<string, string>
  /** The new admin was already created by an earlier attempt: its data is fixed. */
  locked: boolean
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-xs text-destructive mt-1">
      {message}
    </p>
  ) : null
}

const inputClass = 'bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500'

/** "Administrador existente" / "Crear nuevo administrador" section of the create-league dialog. */
export function LeagueAdminFields({ value, onChange, admins, errors, locked }: LeagueAdminFieldsProps) {
  const set = (patch: Partial<AdminDraft>) => onChange({ ...value, ...patch })
  const text = (key: 'name' | 'email' | 'phone' | 'password' | 'confirmPassword', errKey: string, id: string, label: string, type?: string, placeholder?: string) => (
    <div>
      <Label htmlFor={id} className="text-gray-400 text-sm">{label}</Label>
      <Input
        className={inputClass}
        id={id}
        type={type}
        value={value[key]}
        disabled={locked}
        onChange={(e) => set({ [key]: e.target.value })}
        placeholder={placeholder}
        aria-invalid={!!errors[errKey]}
        aria-describedby={errors[errKey] ? `${id}-error` : undefined}
      />
      <FieldError id={`${id}-error`} message={errors[errKey]} />
    </div>
  )

  return (
    <fieldset className="space-y-3 rounded-xl border border-white/10 bg-slate-800/40 p-3">
      <legend className="px-1 text-sm font-medium text-white">Administrador de la liga</legend>
      <RadioGroup
        value={value.mode}
        onValueChange={(v) => set({ mode: v as AdminDraft['mode'] })}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        aria-label="Origen del administrador"
      >
        {([['new', 'Crear nuevo administrador'], ['existing', 'Administrador existente']] as const).map(([mode, label]) => (
          <Label key={mode} htmlFor={`admin-mode-${mode}`} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <RadioGroupItem value={mode} id={`admin-mode-${mode}`} disabled={locked && mode === 'existing'} className="border-white/30 text-green-400" />
            {label}
          </Label>
        ))}
      </RadioGroup>

      {value.mode === 'existing' ? (
        <div>
          <Label htmlFor="admin-existing" className="text-gray-400 text-sm">Administrador *</Label>
          {admins.length > 0 ? (
            <Select value={value.existingId} onValueChange={(v) => set({ existingId: v })}>
              <SelectTrigger
                id="admin-existing"
                className="bg-slate-700/50 border-white/10 text-white"
                aria-invalid={!!errors.admin_existingId}
                aria-describedby={errors.admin_existingId ? 'admin-existing-error' : undefined}
              >
                <SelectValue placeholder="Selecciona un administrador" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id} className="text-white hover:bg-slate-800">
                    {admin.name} ({admin.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-gray-500 mt-1">No hay administradores de liga activos. Crea uno nuevo.</p>
          )}
          <FieldError id="admin-existing-error" message={errors.admin_existingId} />
        </div>
      ) : (
        <div className="space-y-3">
          {text('name', 'admin_name', 'admin-name', 'Nombre del administrador *', undefined, 'Juan Pérez')}
          {text('email', 'admin_email', 'admin-email', 'Email del administrador *', 'email', 'admin@liga.com')}
          {text('phone', 'admin_phone', 'admin-phone', 'Teléfono', undefined, '+52 555 123 4567')}
          {text('password', 'admin_password', 'admin-password', 'Contraseña (mín. 10 caracteres) *', 'password', '••••••••••')}
          {text('confirmPassword', 'admin_confirmPassword', 'admin-confirm', 'Confirmar contraseña *', 'password', '••••••••••')}
        </div>
      )}
    </fieldset>
  )
}
