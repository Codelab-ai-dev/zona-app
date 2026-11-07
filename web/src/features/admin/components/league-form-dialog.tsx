import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminUsers, useCreateLeague, useUpdateLeague } from '../api'
import type { League, ProductMode, CreateLeagueRequest, UpdateLeagueRequest } from '../types'
import { ApiError } from '@/lib/api/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface LeagueFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  league?: League | null
}

export function LeagueFormDialog({ open, onOpenChange, league }: LeagueFormDialogProps) {
  const isEditing = !!league

  const [formData, setFormData] = useState<{
    name: string
    slug: string
    description: string
    logo?: string
    admin_id?: string
    product_mode: ProductMode
  }>(
    isEditing && league
      ? {
          name: league.name,
          slug: league.slug,
          description: league.description,
          logo: league.logo,
          product_mode: league.product_mode,
        }
      : {
          name: '',
          slug: '',
          description: '',
          logo: undefined,
          admin_id: undefined,
          product_mode: 'full',
        },
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Candidates for the league's admin (only needed when creating)
  const users = useAdminUsers({ limit: 100 })
  const admins = (users.data?.data ?? []).filter((u) => u.role === 'league_admin' && u.is_active)

  const createLeague = useCreateLeague()
  const updateLeague = useUpdateLeague()

  const isPending = createLeague.isPending || updateLeague.isPending

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (value: string) => {
    // The slug follows the name only when creating: renaming must not break public URLs
    setFormData((prev) => ({ ...prev, name: value, slug: isEditing ? prev.slug : generateSlug(value) }))
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setErrors({})
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async () => {
    setErrors({})

    try {
      if (isEditing && league) {
        const updateData: UpdateLeagueRequest = {
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          logo: formData.logo,
        }
        await updateLeague.mutateAsync({ id: league.id, data: updateData })
        toast.success('Liga actualizada exitosamente')
      } else {
        const createData: CreateLeagueRequest = {
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          logo: formData.logo,
          admin_id: formData.admin_id,
          product_mode: formData.product_mode,
        }
        await createLeague.mutateAsync(createData)
        toast.success('Liga creada exitosamente')
      }
      handleOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isValidation && Object.keys(err.fields).length > 0) {
          setErrors(err.fields)
        } else if (err.status === 409) {
          setErrors({ slug: 'Esta URL ya está en uso' })
        } else {
          toast.error(err.message)
        }
      } else {
        toast.error('Error al guardar la liga')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Liga' : 'Crear Nueva Liga'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica la información de la liga' : 'Completa los datos para crear una nueva liga'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre de la Liga *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Liga Premier Mexicana"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-xs text-destructive mt-1">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="slug">URL Personalizada *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))}
              placeholder="liga-premier-mexicana"
              aria-invalid={!!errors.slug}
              aria-describedby={errors.slug ? 'slug-error' : undefined}
            />
            {errors.slug && (
              <p id="slug-error" className="text-xs text-destructive mt-1">
                {errors.slug}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción de la liga…"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
            />
            {errors.description && (
              <p id="description-error" className="text-xs text-destructive mt-1">
                {errors.description}
              </p>
            )}
          </div>

          {!isEditing && (
            <>
              <div>
                <Label htmlFor="product-mode">Tipo de Producto</Label>
                <Select value={formData.product_mode} onValueChange={(v) => setFormData((prev) => ({ ...prev, product_mode: v as ProductMode }))}>
                  <SelectTrigger id="product-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Completo</SelectItem>
                    <SelectItem value="web_only">Web Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {admins.length > 0 && (
                <div>
                  <Label htmlFor="admin-id">Administrador</Label>
                  <Select value={formData.admin_id || ''} onValueChange={(v) => setFormData((prev) => ({ ...prev, admin_id: v }))}>
                    <SelectTrigger id="admin-id">
                      <SelectValue placeholder="Selecciona un administrador" />
                    </SelectTrigger>
                    <SelectContent>
                      {admins.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.name} ({admin.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Actualizar' : 'Crear'} Liga
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
