import { useState } from 'react'
import { Eye, EyeOff, Shield } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLeagueTournaments } from '@/features/leagues/api'
import { ApiError } from '@/lib/api/client'

import { OwnerCreationError, useCreateTeam } from '../api'
import {
  buildRequests,
  emptyOwner,
  emptyTeam,
  mapServerFields,
  NO_TOURNAMENT,
  slugify,
  validateOwner,
  validateTeam,
  withoutError,
  type FieldErrors,
  type OwnerData,
  type TeamData,
} from './create-team-form'
import { FormField } from './form-field'

export interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leagueId: string
}

export function CreateTeamDialog({ open, onOpenChange, leagueId }: CreateTeamDialogProps) {
  const [step, setStep] = useState<'team' | 'owner'>('team')
  const [showPassword, setShowPassword] = useState(false)
  const [team, setTeam] = useState<TeamData>(emptyTeam)
  const [slugEdited, setSlugEdited] = useState(false)
  const [owner, setOwner] = useState<OwnerData>(emptyOwner)
  const [errors, setErrors] = useState<FieldErrors>({})
  // True once POST /teams succeeded but the owner failed: retries skip the team.
  const [teamCreated, setTeamCreated] = useState(false)
  const createMutation = useCreateTeam()
  const tournaments = useLeagueTournaments(leagueId).data?.data ?? []

  const clearError = (key: string) => setErrors((prev) => withoutError(prev, key))

  const changeTeam = (field: keyof TeamData, value: string) => {
    setTeam((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'name' && !slugEdited ? { slug: slugify(value) } : {}),
    }))
    if (field === 'slug') setSlugEdited(true)
    clearError(field)
    if (field === 'name') clearError('slug')
  }

  const changeOwner = (field: keyof OwnerData, value: string, errorKey: string = field) => {
    setOwner((prev) => ({ ...prev, [field]: value }))
    clearError(errorKey)
  }

  const handleClose = () => {
    setStep('team')
    setTeam(emptyTeam)
    setSlugEdited(false)
    setOwner(emptyOwner)
    setErrors({})
    setTeamCreated(false)
    setShowPassword(false)
    onOpenChange(false)
  }

  const handleContinue = () => {
    const found = validateTeam(team)
    setErrors(found)
    if (Object.keys(found).length === 0) setStep('owner')
  }

  const handleSubmit = async () => {
    const found = validateOwner(owner)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    try {
      await createMutation.mutateAsync({ ...buildRequests(team, owner, leagueId), skipTeam: teamCreated })
      handleClose()
    } catch (error) {
      const fromOwner = error instanceof OwnerCreationError
      const cause = fromOwner ? error.cause : error
      if (fromOwner) setTeamCreated(true)
      const message = cause instanceof Error ? cause.message : 'No se pudo crear el equipo'
      if (cause instanceof ApiError && Object.keys(cause.fields).length > 0) {
        const fields = mapServerFields(cause.fields, fromOwner)
        setErrors(fields)
        if (!fromOwner) setStep('team')
      }
      toast.error(fromOwner ? `El equipo se creó, pero falló el propietario: ${message}` : message)
    }
  }

  const passwordType = showPassword ? 'text' : 'password'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto border-white/10 bg-slate-900 md:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-sm text-white md:text-base">
            <Shield className="mr-2 h-4 w-4 text-green-400" aria-hidden="true" />
            Crear Nuevo Equipo
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400 md:text-sm">{step === 'team' ? 'Información del equipo' : 'Información del propietario'}</DialogDescription>
        </DialogHeader>

        {step === 'team' && (
          <div className="space-y-3 py-3">
            <FormField id="name" label="Nombre del equipo" placeholder="ej. Los Campeones" value={team.name} error={errors.name} onChange={(e) => changeTeam('name', e.target.value)} />
            <FormField id="slug" label="Slug" forceLowercase placeholder="ej. los-campeones" value={team.slug} error={errors.slug} onChange={(e) => changeTeam('slug', e.target.value)} />
            <div>
              <Label htmlFor="description" className="mb-1.5 block text-[10px] text-gray-400 md:text-xs">Descripción</Label>
              <Textarea className="min-h-[60px] border-white/10 bg-slate-800/50 text-sm text-white placeholder:text-gray-500" id="description" placeholder="Descripción del equipo (opcional)" value={team.description} onChange={(e) => changeTeam('description', e.target.value)} rows={3} />
            </div>
            <div>
              <Label htmlFor="team-tournament" className="mb-1.5 block text-[10px] text-gray-400 md:text-xs">Torneo (opcional)</Label>
              <Select value={team.tournamentId} onValueChange={(value) => changeTeam('tournamentId', value)}>
                <SelectTrigger id="team-tournament" className="h-9 border-white/10 bg-slate-800/50 text-sm text-white">
                  <SelectValue placeholder="Sin torneo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TOURNAMENT}>Sin torneo</SelectItem>
                  {tournaments.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tournament_id && <p className="mt-1 text-xs text-red-400">{errors.tournament_id}</p>}
            </div>
            <Button onClick={handleContinue} className="h-9 w-full bg-green-500 text-xs text-white hover:bg-green-600 md:text-sm">
              Continuar
            </Button>
          </div>
        )}

        {step === 'owner' && (
          <div className="space-y-3 py-3">
            <FormField id="owner-name" label="Nombre del propietario" placeholder="ej. Juan Pérez" value={owner.name} error={errors.ownerName} onChange={(e) => changeOwner('name', e.target.value, 'ownerName')} />
            <FormField id="owner-email" type="email" label="Email" placeholder="propietario@ejemplo.com" value={owner.email} error={errors.email} onChange={(e) => changeOwner('email', e.target.value)} />
            <FormField id="owner-phone" type="tel" label="Teléfono (opcional)" placeholder="+52 555-0123" value={owner.phone} onChange={(e) => changeOwner('phone', e.target.value)} />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <FormField id="owner-password" type={passwordType} label="Contraseña (mínimo 10 caracteres)" value={owner.password} error={errors.password} onChange={(e) => changeOwner('password', e.target.value)} />
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:bg-white/10 hover:text-white"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </div>
            <FormField id="owner-confirm-password" type={passwordType} label="Confirmar contraseña" value={owner.confirmPassword} error={errors.confirmPassword} onChange={(e) => changeOwner('confirmPassword', e.target.value)} />

            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="h-9 w-full bg-green-500 text-xs text-white hover:bg-green-600 md:text-sm">
              {createMutation.isPending ? 'Creando…' : teamCreated ? 'Reintentar propietario' : 'Crear equipo y propietario'}
            </Button>
            <Button onClick={() => setStep('team')} disabled={teamCreated} className="h-9 w-full border-white/10 bg-slate-800/50 text-xs text-gray-400 hover:bg-slate-700/50 hover:text-white md:text-sm">
              Atrás
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
