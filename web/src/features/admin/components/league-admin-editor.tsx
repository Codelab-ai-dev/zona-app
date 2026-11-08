import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { useAdminUser, useSetLeagueAdmin, useUpdateUser } from '../api'
import type { League, UpdateUserRequest, User } from '../types'

const inputClass = 'bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500'
type Edits = Pick<UpdateUserRequest, 'name' | 'email' | 'phone'>

/**
 * Change the admin of an existing league and, optionally, edit that admin's
 * name, email and phone. Each part sends its own request.
 */
export function LeagueAdminEditor({ league, admins }: { league: League; admins: User[] }) {
  const setAdmin = useSetLeagueAdmin()
  const updateUser = useUpdateUser()
  const [currentId, setCurrentId] = useState(league.admin_id)
  const [selectedId, setSelectedId] = useState(league.admin_id)
  const [edits, setEdits] = useState<Edits>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const adminQuery = useAdminUser(selectedId)
  const admin = adminQuery.data

  // The current admin may not be in the (capped) candidate list.
  const options = admin && !admins.some((a) => a.id === admin.id) ? [admin, ...admins] : admins
  const value = (key: keyof Edits) => edits[key] ?? admin?.[key] ?? ''
  const pending = setAdmin.isPending || updateUser.isPending

  const select = (id: string) => {
    setSelectedId(id)
    setEdits({})
    setErrors({})
  }

  const changed = (Object.keys(edits) as (keyof Edits)[]).reduce<Edits>((acc, key) => {
    const next = edits[key]
    return next !== undefined && next !== (admin?.[key] ?? '') ? { ...acc, [key]: next } : acc
  }, {})
  const hasChanges = selectedId !== currentId || Object.keys(changed).length > 0

  const handleSave = async () => {
    setErrors({})
    try {
      if (selectedId !== currentId) {
        await setAdmin.mutateAsync({ id: league.id, admin_id: selectedId })
        setCurrentId(selectedId)
      }
      if (Object.keys(changed).length > 0) {
        await updateUser.mutateAsync({ id: selectedId, data: changed })
        setEdits({})
      }
      toast.success('Administrador actualizado exitosamente')
    } catch (err) {
      if (err instanceof ApiError && err.isValidation && Object.keys(err.fields).length > 0) {
        setErrors(err.fields)
      } else if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: 'Este correo ya está registrado' })
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Error al actualizar el administrador')
      }
    }
  }

  const field = (key: keyof Edits, id: string, label: string, type?: string) => (
    <div>
      <Label htmlFor={id} className="text-gray-400 text-sm">{label}</Label>
      <Input
        className={inputClass}
        id={id}
        type={type}
        value={value(key)}
        onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${id}-error` : undefined}
      />
      {errors[key] && <p id={`${id}-error`} className="text-xs text-destructive mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <fieldset className="space-y-3 rounded-xl border border-white/10 bg-slate-800/40 p-3">
      <legend className="px-1 text-sm font-medium text-white">Administrador de la liga</legend>
      <div>
        <Label htmlFor="league-admin" className="text-gray-400 text-sm">Administrador</Label>
        <Select value={selectedId} onValueChange={select}>
          <SelectTrigger
            id="league-admin"
            className="bg-slate-700/50 border-white/10 text-white"
            aria-invalid={!!errors.admin_id}
            aria-describedby={errors.admin_id ? 'league-admin-error' : undefined}
          >
            <SelectValue placeholder="Selecciona un administrador" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            {options.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-white hover:bg-slate-800">
                {a.name} ({a.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.admin_id && <p id="league-admin-error" className="text-xs text-destructive mt-1">{errors.admin_id}</p>}
      </div>

      {adminQuery.isError ? (
        <p className="text-xs text-gray-500">No se pudieron cargar los datos del administrador.</p>
      ) : admin ? (
        <div className="space-y-3">
          {field('name', 'league-admin-name', 'Nombre')}
          {field('email', 'league-admin-email', 'Email', 'email')}
          {field('phone', 'league-admin-phone', 'Teléfono')}
        </div>
      ) : (
        <p className="text-xs text-gray-500">Cargando administrador…</p>
      )}

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => void handleSave()}
          disabled={pending || !hasChanges || adminQuery.isPending}
          className="bg-green-500 hover:bg-green-600 text-white border-0"
        >
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {pending ? 'Guardando…' : 'Guardar administrador'}
        </Button>
      </div>
    </fieldset>
  )
}
