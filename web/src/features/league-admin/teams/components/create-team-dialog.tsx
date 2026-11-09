import { useState } from 'react'
import { Loader2, Shield } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  generatePassword,
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
import { LogoPicker } from './logo-picker'
import { OwnerCredentialsDialog, type OwnerCredentials } from './owner-credentials-dialog'

export interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leagueId: string
}

const heading = 'border-b border-white/10 pb-2 text-xs font-medium text-white md:text-sm'
const initialsOf = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

export function CreateTeamDialog({ open, onOpenChange, leagueId }: CreateTeamDialogProps) {
  const [team, setTeam] = useState<TeamData>(emptyTeam)
  const [slugEdited, setSlugEdited] = useState(false)
  const [owner, setOwner] = useState<OwnerData>(emptyOwner)
  const [logo, setLogo] = useState<File | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  // True once POST /teams succeeded but the owner failed: retries skip the team.
  const [teamCreated, setTeamCreated] = useState(false)
  const [credentials, setCredentials] = useState<OwnerCredentials | null>(null)
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

  const reset = () => {
    setTeam(emptyTeam)
    setSlugEdited(false)
    setOwner(emptyOwner)
    setLogo(null)
    setErrors({})
    setTeamCreated(false)
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    const found = { ...validateTeam(team), ...validateOwner(owner) }
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const password = generatePassword()
    try {
      const { logoError } = await createMutation.mutateAsync({
        ...buildRequests(team, owner, password, leagueId),
        skipTeam: teamCreated,
        logo,
      })
      setCredentials({ name: owner.name.trim(), email: owner.email.trim(), password })
      toast.success('Equipo creado exitosamente')
      if (logoError) toast.warning(`El equipo se creó, pero no se pudo guardar el logo: ${logoError}`)
      handleClose()
    } catch (error) {
      const fromOwner = error instanceof OwnerCreationError
      const cause = fromOwner ? error.cause : error
      if (fromOwner) setTeamCreated(true)
      const message = cause instanceof Error ? cause.message : 'No se pudo crear el equipo'
      if (cause instanceof ApiError && Object.keys(cause.fields).length > 0) setErrors(mapServerFields(cause.fields, fromOwner))
      toast.error(fromOwner ? `El equipo se creó, pero falló el propietario: ${message}` : message)
    }
  }

  const pending = createMutation.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto border-white/10 bg-slate-900 md:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-sm text-white md:text-base">
              <Shield className="mr-2 h-4 w-4 text-green-400" aria-hidden="true" />
              Crear Nuevo Equipo
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 md:text-sm">
              Agrega un nuevo equipo a tu liga. El equipo será aprobado automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className={heading}>Información del Equipo</h4>
              <LogoPicker fallback={initialsOf(team.name)} disabled={pending || teamCreated} onChange={setLogo} />
              <FormField id="team-name" label="Nombre del Equipo *" placeholder="Ej: Real Madrid CF" value={team.name} error={errors.name} onChange={(e) => changeTeam('name', e.target.value)} />
              <div>
                <FormField id="team-slug" label="URL Personalizada" forceLowercase placeholder="real-madrid-cf" value={team.slug} error={errors.slug} onChange={(e) => changeTeam('slug', e.target.value)} />
                <p className="mt-1 text-[10px] text-gray-500">Se generará automáticamente si se deja vacío</p>
              </div>
              <div>
                <Label htmlFor="team-description" className="mb-1.5 block text-[10px] text-gray-400 md:text-xs">Descripción</Label>
                <Textarea className="min-h-[60px] border-white/10 bg-slate-800/50 text-sm text-white placeholder:text-gray-500" id="team-description" placeholder="Descripción del equipo..." value={team.description} onChange={(e) => changeTeam('description', e.target.value)} rows={2} />
              </div>
              <div>
                <Label htmlFor="team-tournament" className="mb-1.5 block text-[10px] text-gray-400 md:text-xs">Torneo (Opcional)</Label>
                <Select value={team.tournamentId} onValueChange={(value) => changeTeam('tournamentId', value)}>
                  <SelectTrigger id="team-tournament" className="h-9 border-white/10 bg-slate-800/50 text-sm text-white">
                    <SelectValue placeholder="Seleccionar torneo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TOURNAMENT}>Sin torneo asignado</SelectItem>
                    {tournaments.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tournament_id && <p className="mt-1 text-xs text-red-400">{errors.tournament_id}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className={heading}>Información del Propietario</h4>
              <FormField id="owner-name" label="Nombre Completo *" placeholder="Ej: Juan Pérez" value={owner.name} error={errors.ownerName} onChange={(e) => changeOwner('name', e.target.value, 'ownerName')} />
              <FormField id="owner-email" type="email" label="Email *" placeholder="propietario@ejemplo.com" value={owner.email} error={errors.email} onChange={(e) => changeOwner('email', e.target.value)} />
              <FormField id="owner-phone" type="tel" label="Teléfono" placeholder="+502 1234-5678" value={owner.phone} error={errors.phone} onChange={(e) => changeOwner('phone', e.target.value)} />
              <div className="space-y-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                <h5 className="text-xs font-medium text-blue-400">Información importante</h5>
                <ul className="space-y-0.5 text-[10px] text-gray-400 md:text-xs">
                  <li>• Se creará una cuenta para el propietario</li>
                  <li>• Recibirá una contraseña temporal</li>
                  <li>• Podrá gestionar los jugadores</li>
                </ul>
              </div>
              {errors.password && <p role="alert" className="text-xs text-red-400">{errors.password}</p>}
            </div>
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button onClick={handleClose} disabled={pending} className="h-9 flex-1 border-white/10 bg-slate-800/50 text-xs text-gray-400 hover:bg-slate-700/50 hover:text-white md:text-sm">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending} className="h-9 flex-1 bg-green-500 text-xs text-white hover:bg-green-600 md:text-sm">
              {pending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Creando...
                </>
              ) : teamCreated ? (
                'Reintentar propietario'
              ) : (
                'Crear Equipo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <OwnerCredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </>
  )
}
