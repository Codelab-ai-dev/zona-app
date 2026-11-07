import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import { useCreateTeam } from '../api'
import type { CreateTeamRequest, CreateUserRequest } from '../types'

export interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leagueId: string
}

export function CreateTeamDialog({ open, onOpenChange, leagueId }: CreateTeamDialogProps) {
  const [step, setStep] = useState<'team' | 'owner'>('team')
  const [showPassword, setShowPassword] = useState(false)
  const [teamData, setTeamData] = useState({
    name: '',
    slug: '',
    description: '',
    logo: '',
  })
  const [ownerData, setOwnerData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createMutation = useCreateTeam()

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleTeamChange = (field: string, value: string) => {
    setTeamData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'name' && !prev.slug ? { slug: generateSlug(value) } : {}),
    }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleOwnerChange = (field: string, value: string) => {
    setOwnerData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validateTeam = () => {
    const newErrors: Record<string, string> = {}
    if (!teamData.name.trim()) newErrors.name = 'El nombre es requerido'
    if (!teamData.slug.trim()) newErrors.slug = 'El slug es requerido'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }
    return true
  }

  const validateOwner = () => {
    const newErrors: Record<string, string> = {}
    if (!ownerData.name.trim()) newErrors.name = 'El nombre del propietario es requerido'
    if (!ownerData.email.trim()) {
      newErrors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerData.email)) {
      newErrors.email = 'Email inválido'
    }
    if (!ownerData.password) {
      newErrors.password = 'La contraseña es requerida'
    } else if (ownerData.password.length < 10) {
      newErrors.password = 'La contraseña debe tener mínimo 10 caracteres'
    }
    if (!ownerData.confirmPassword) {
      newErrors.confirmPassword = 'La confirmación es requerida'
    } else if (ownerData.password !== ownerData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }
    return true
  }

  const handleContinueTeam = () => {
    if (validateTeam()) {
      setStep('owner')
    }
  }

  const handleCreateTeamWithOwner = async () => {
    if (!validateOwner()) return

    const team: CreateTeamRequest = {
      name: teamData.name,
      slug: teamData.slug,
      league_id: leagueId,
      description: teamData.description || undefined,
      logo: teamData.logo || undefined,
    }

    const owner: CreateUserRequest = {
      name: ownerData.name,
      email: ownerData.email,
      password: ownerData.password,
      phone: ownerData.phone || undefined,
      role: 'team_owner',
      league_id: leagueId,
    }

    try {
      await createMutation.mutateAsync({ team, owner })
      // Close dialog directly after successful creation
      handleClose()
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        setErrors(error.fields)
      }
    }
  }

  const handleClose = () => {
    setStep('team')
    setTeamData({ name: '', slug: '', description: '', logo: '' })
    setOwnerData({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear equipo</DialogTitle>
          <DialogDescription>
            {step === 'team' ? 'Información del equipo' : 'Información del propietario'}
          </DialogDescription>
        </DialogHeader>

        {step === 'team' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del equipo</Label>
              <Input
                id="name"
                placeholder="ej. Los Campeones"
                value={teamData.name}
                onChange={(e) => handleTeamChange('name', e.target.value)}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="ej. los-campeones"
                value={teamData.slug}
                onChange={(e) => handleTeamChange('slug', e.target.value)}
                aria-invalid={!!errors.slug}
              />
              {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción del equipo (opcional)"
                value={teamData.description}
                onChange={(e) => handleTeamChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <Button onClick={handleContinueTeam} className="w-full">
              Continuar
            </Button>
          </div>
        )}

        {step === 'owner' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="owner-name">Nombre del propietario</Label>
              <Input
                id="owner-name"
                placeholder="ej. Juan Pérez"
                value={ownerData.name}
                onChange={(e) => handleOwnerChange('name', e.target.value)}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-email">Email</Label>
              <Input
                id="owner-email"
                type="email"
                placeholder="propietario@ejemplo.com"
                value={ownerData.email}
                onChange={(e) => handleOwnerChange('email', e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-phone">Teléfono (opcional)</Label>
              <Input
                id="owner-phone"
                type="tel"
                placeholder="+52 555-0123"
                value={ownerData.phone}
                onChange={(e) => handleOwnerChange('phone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-password">Contraseña (mínimo 10 caracteres)</Label>
              <div className="flex gap-2">
                <Input
                  id="owner-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa una contraseña"
                  value={ownerData.password}
                  onChange={(e) => handleOwnerChange('password', e.target.value)}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && <p id="password-error" className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner-confirm-password">Confirmar contraseña</Label>
              <Input
                id="owner-confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirma tu contraseña"
                value={ownerData.confirmPassword}
                onChange={(e) => handleOwnerChange('confirmPassword', e.target.value)}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
              />
              {errors.confirmPassword && <p id="confirm-password-error" className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>

            <Button onClick={handleCreateTeamWithOwner} disabled={createMutation.isPending} className="w-full">
              {createMutation.isPending ? 'Creando…' : 'Crear equipo y propietario'}
            </Button>

            <Button variant="outline" onClick={() => setStep('team')} className="w-full">
              Atrás
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
