import { AlertCircle, Upload } from 'lucide-react'
import { useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { QueryState } from '@/components/states'
import { ApiError } from '@/lib/api/client'

import { useLeague, useUpdateLeague, useUploadLogo } from '../api'

export function SettingsPage({ leagueId }: { leagueId: string }) {
  const league = useLeague(leagueId)
  const update = useUpdateLeague(leagueId)
  const uploadLogo = useUploadLogo(leagueId)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    logo: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form when league loads
  if (league.data && !formData.name) {
    setFormData({
      name: league.data.name || '',
      slug: league.data.slug || '',
      description: league.data.description || '',
      logo: league.data.logo || '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      await update.mutateAsync({
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        logo: formData.logo,
      })
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setErrors(err.fields)
      }
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (!file) return

    try {
      const result = await uploadLogo.mutateAsync(file)
      setFormData({ ...formData, logo: result.url })
    } catch {
      // Error is already handled by mutation toast
    }
  }

  const isPending = update.isPending || uploadLogo.isPending

  return (
    <QueryState query={league} loadingLabel="Cargando configuración…">
      {() => (
        <section aria-labelledby="settings-title" className="space-y-6 max-w-2xl">
          <header>
            <h2 id="settings-title" className="text-2xl font-bold">
              Configuración de la Liga
            </h2>
            <p className="text-sm text-muted-foreground">Administra los detalles de tu liga</p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Logo de la Liga</CardTitle>
              <CardDescription>Sube la imagen del escudo o logo de tu liga</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  {formData.logo && <AvatarImage src={formData.logo} alt="Liga logo" />}
                  <AvatarFallback>{formData.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <Button asChild>
                      <span className="gap-2">
                        <Upload className="size-4" />
                        Cargar Logo
                      </span>
                    </Button>
                  </Label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isPending}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-2">JPG, PNG o GIF (máx. 5MB)</p>
                </div>
              </div>
              {uploadLogo.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Error al cargar el logo</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>Detalles principales de la liga</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {update.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {update.error instanceof Error ? update.error.message : 'Error al guardar'}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Liga</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                    disabled={isPending}
                  />
                  {errors.name && (
                    <p id="name-error" className="text-xs text-destructive">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="mi-liga"
                    aria-invalid={!!errors.slug}
                    aria-describedby={errors.slug ? 'slug-error' : undefined}
                    disabled={isPending}
                  />
                  {errors.slug && (
                    <p id="slug-error" className="text-xs text-destructive">
                      {errors.slug}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe tu liga…"
                    aria-invalid={!!errors.description}
                    aria-describedby={errors.description ? 'description-error' : undefined}
                    disabled={isPending}
                    rows={4}
                  />
                  {errors.description && (
                    <p id="description-error" className="text-xs text-destructive">
                      {errors.description}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                  {isPending ? 'Guardando…' : 'Guardar Cambios'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      )}
    </QueryState>
  )
}
