import { AlertCircle, Upload } from 'lucide-react'
import { useState } from 'react'

import { QueryState } from '@/components/states'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'

import { useLeague, useUpdateLeague, useUploadLogo } from '../api'
import type { League } from '../types'

export function SettingsPage({ leagueId }: { leagueId: string }) {
  const league = useLeague(leagueId)

  return (
    <QueryState query={league} loadingLabel="Cargando configuración…">
      {(data) => (
        <section aria-labelledby="settings-title" className="space-y-6 max-w-2xl">
          <header>
            <h2 id="settings-title" className="text-2xl font-bold">
              Configuración de la Liga
            </h2>
            <p className="text-sm text-muted-foreground">Administra los detalles de tu liga</p>
          </header>
          <LogoCard league={data} />
          <GeneralCard league={data} />
        </section>
      )}
    </QueryState>
  )
}

/** Uploading stores the file and immediately saves the returned public URL as the league logo. */
function LogoCard({ league }: { league: League }) {
  const upload = useUploadLogo(league.id)
  const update = useUpdateLeague(league.id)
  const isPending = upload.isPending || update.isPending

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!file) return
    try {
      const { url } = await upload.mutateAsync(file)
      if (url) await update.mutateAsync({ logo: url })
    } catch {
      // The mutations already show the error toast.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo de la Liga</CardTitle>
        <CardDescription>Sube la imagen del escudo o logo de tu liga</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-20">
            {league.logo && <AvatarImage src={league.logo} alt={`Logo de ${league.name}`} />}
            <AvatarFallback>{league.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <Label htmlFor="logo-upload" className="cursor-pointer">
              <Button asChild>
                <span className="gap-2">
                  <Upload className="size-4" aria-hidden="true" />
                  {isPending ? 'Cargando…' : 'Cargar Logo'}
                </span>
              </Button>
            </Label>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleChange}
              disabled={isPending}
              className="sr-only"
            />
            <p className="text-xs text-muted-foreground mt-2">JPG, PNG o GIF (máx. 5MB)</p>
          </div>
        </div>
        {upload.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{upload.error.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function GeneralCard({ league }: { league: League }) {
  const update = useUpdateLeague(league.id)
  const [formData, setFormData] = useState({
    name: league.name,
    slug: league.slug,
    description: league.description,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    try {
      await update.mutateAsync(formData)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) setErrors(err.fields)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información General</CardTitle>
        <CardDescription>Detalles principales de la liga</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {update.isError && Object.keys(errors).length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{update.error.message}</AlertDescription>
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
              disabled={update.isPending}
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
              forceLowercase
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="mi-liga"
              aria-invalid={!!errors.slug}
              aria-describedby={errors.slug ? 'slug-error' : undefined}
              disabled={update.isPending}
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
              disabled={update.isPending}
              rows={4}
            />
            {errors.description && (
              <p id="description-error" className="text-xs text-destructive">
                {errors.description}
              </p>
            )}
          </div>

          <Button type="submit" disabled={update.isPending} className="w-full sm:w-auto">
            {update.isPending ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
