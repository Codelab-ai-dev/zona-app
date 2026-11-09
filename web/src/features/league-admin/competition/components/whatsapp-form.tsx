import { AlertCircle, Loader2, MessageSquare, Phone } from 'lucide-react'
import { useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'

import { NO_TOURNAMENT, useCreateWhatsAppLink, useLeagueUsers, useTournaments, useUpdateWhatsAppLink } from '../api'
import type { WhatsAppLink } from '../types'

interface WhatsAppFormProps {
  leagueId: string
  /** When set the dialog edits that link (name, language, tournament); the phone and role stay. */
  link?: WhatsAppLink
  onClose: () => void
}

const NONE = 'none'

/** "+52 55 1234-5678" -> "525512345678": the API takes 10-15 digits without symbols. */
export const cleanPhone = (value: string) => value.replace(/[\s\-()]/g, '').replace(/^\+/, '')
const phoneFormatError = 'Formato de teléfono inválido. Debe ser: +52XXXXXXXXXX'
const trigger = 'h-10 bg-slate-800/50 border-white/10 text-white text-sm'
const inputClass = 'h-10 bg-slate-800/50 border-white/10 text-white placeholder:text-gray-500 text-sm'
const labelClass = 'text-[10px] md:text-xs text-gray-400'

export function WhatsAppForm({ leagueId, link, onClose }: WhatsAppFormProps) {
  const [formData, setFormData] = useState({
    phone_number: link?.phone_number ?? '',
    role: link?.role ?? 'team_owner',
    display_name: link?.display_name ?? '',
    preferred_language: link?.preferred_language ?? 'es',
    tournament_id: link?.tournament_id ?? NONE,
    user_id: NONE,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touchedTournament, setTouchedTournament] = useState(Boolean(link))

  const tournaments = useTournaments(leagueId)
  // Creating: preselect the active tournament, like the original (until the user picks one).
  const activeTournament = (tournaments.data?.data ?? []).find((t) => t.is_active)?.id
  const tournamentValue = !touchedTournament && activeTournament ? activeTournament : formData.tournament_id
  const users = useLeagueUsers(leagueId, !link)
  const create = useCreateWhatsAppLink(leagueId)
  const update = useUpdateWhatsAppLink(link?.id ?? '')
  const pending = create.isPending || update.isPending
  const failure = create.error ?? update.error

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    const phone = cleanPhone(formData.phone_number)
    if (!/^\d{10,15}$/.test(phone)) {
      setErrors({ phone_number: phoneFormatError })
      return
    }

    try {
      if (link) {
        await update.mutateAsync({
          ...(phone !== link.phone_number ? { phone_number: phone } : {}),
          display_name: formData.display_name,
          preferred_language: formData.preferred_language,
          tournament_id: tournamentValue === NONE ? NO_TOURNAMENT : tournamentValue,
        })
      } else {
        const user = (users.data?.data ?? []).find((u) => u.id === formData.user_id)
        const displayName = formData.display_name.trim() || user?.name
        await create.mutateAsync({
          phone_number: phone,
          role: formData.role,
          preferred_language: formData.preferred_language,
          ...(displayName ? { display_name: displayName } : {}),
          ...(user ? { user_id: user.id } : {}),
          ...(tournamentValue !== NONE ? { tournament_id: tournamentValue } : {}),
        })
      }
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        // ApiError.fields is always an object; only use it when it has entries.
        if (Object.keys(err.fields).length > 0) {
          setErrors(err.fields)
        } else if (err.status === 409) {
          setErrors({ phone_number: 'Este número de teléfono ya está vinculado' })
        }
      }
    }
  }

  const pickUser = (userId: string) => {
    const user = (users.data?.data ?? []).find((u) => u.id === userId)
    setFormData((prev) => ({
      ...prev,
      user_id: userId,
      // The account decides the role, like in the original.
      role: user && roleOptions.some((r) => r.value === user.role) ? user.role : prev.role,
    }))
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-lg bg-slate-900 border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-400" aria-hidden="true" />
            {link ? 'Editar' : 'Crear'} Vínculo de WhatsApp
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs md:text-sm">
            {link ? 'Actualiza la información del vínculo de WhatsApp' : 'Vincula un número de WhatsApp con un usuario de tu liga'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {failure && Object.keys(errors).length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{failure.message}</AlertDescription>
            </Alert>
          )}

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-blue-300/90">El formato del número debe incluir el código de país (ejemplo: +5215512345678)</p>
            </div>
          </div>

          {!link && (
            <div className="space-y-2">
              <Label htmlFor="wa-user" className={labelClass}>Usuario (opcional)</Label>
              <Select value={formData.user_id} onValueChange={pickUser} disabled={pending}>
                <SelectTrigger id="wa-user" className={trigger}>
                  <SelectValue placeholder="Sin usuario vinculado" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                  <SelectItem value={NONE}>Sin usuario vinculado</SelectItem>
                  {(users.data?.data ?? []).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} - {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone" className={labelClass}>Número de WhatsApp</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />
              <Input
                className={`pl-10 ${inputClass}`}
                id="phone"
                type="tel"
                placeholder="+5215512345678"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                aria-invalid={!!errors.phone_number}
                aria-describedby={errors.phone_number ? 'phone-error' : undefined}
                disabled={pending}
              />
            </div>
            {errors.phone_number && (
              <p id="phone-error" className="text-xs text-red-400">
                {errors.phone_number}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name" className={labelClass}>Nombre para Mostrar (Opcional)</Label>
            <Input
              className={inputClass}
              id="display_name"
              placeholder="Nombre del contacto"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className={labelClass}>Rol</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })} disabled={pending || Boolean(link)}>
              <SelectTrigger id="role" className={trigger}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                {roleOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-tournament" className={labelClass}>Torneo Activo</Label>
            <Select
              value={tournamentValue}
              onValueChange={(value) => {
                setTouchedTournament(true)
                setFormData({ ...formData, tournament_id: value })
              }}
              disabled={pending}
            >
              <SelectTrigger
                id="wa-tournament"
                className={trigger}
                aria-invalid={!!errors.tournament_id}
                aria-describedby={errors.tournament_id ? 'tournament-error' : undefined}
              >
                <SelectValue placeholder="Selecciona un torneo" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                <SelectItem value={NONE}>Sin torneo</SelectItem>
                {(tournaments.data?.data ?? []).map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    {tournament.name} {tournament.is_active && '(Activo)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">El torneo determina qué datos puede consultar el usuario en WhatsApp</p>
            {errors.tournament_id && (
              <p id="tournament-error" className="text-xs text-red-400">
                {errors.tournament_id}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="wa-language" className={labelClass}>Idioma Preferido</Label>
            <Select value={formData.preferred_language} onValueChange={(value) => setFormData({ ...formData, preferred_language: value })} disabled={pending}>
              <SelectTrigger id="wa-language" className={trigger}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending} className="text-gray-400 hover:text-white hover:bg-slate-800/50">
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white" disabled={pending || !formData.phone_number.trim()}>
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              {pending ? (link ? 'Actualizando...' : 'Creando...') : link ? 'Actualizar Vínculo' : 'Crear Vínculo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const roleOptions = [
  { value: 'league_admin', label: 'Admin de Liga' },
  { value: 'team_owner', label: 'Dueño de Equipo' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'user', label: 'Usuario' },
]
