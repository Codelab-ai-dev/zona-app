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
import { SecurityCards } from './security-cards'
import { ApiError } from '@/lib/api/client'

import { useLeague, useUpdateLeague, useUploadLogo } from '../api'
import type { League } from '../types'

export function SettingsPage({ leagueId }: { leagueId: string }) {
  const league = useLeague(leagueId)

  return (
    <div className="space-y-6">
    <SecurityCards />
    <QueryState query={league} loadingLabel="Cargando configuración…">
      {(data) => (
        <section aria-labelledby="settings-title" className="space-y-6">
          <header className="pt-2">
            <h2 id="settings-title" className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
              Configuración de la Liga
            </h2>
            <p className="text-white/80 drop-shadow">Administra los detalles de tu liga</p>
          </header>
          <LogoCard league={data} />
          <GeneralCard league={data} />
        </section>
      )}
    </QueryState>
    </div>
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
    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white drop-shadow-lg">Logo de la Liga</CardTitle>
        <CardDescription className="text-white/80 drop-shadow">Sube la imagen del escudo o logo de tu liga</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-20">
            {league.logo && <AvatarImage src={league.logo} alt={`Logo de ${league.name}`} />}
            <AvatarFallback className="bg-green-500/20 text-green-300">{league.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <Label htmlFor="logo-upload" className="cursor-pointer text-white">
              <Button asChild className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0">
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
            <p className="text-xs text-white/60 mt-2">JPG, PNG o GIF (máx. 5MB)</p>
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
    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-white drop-shadow-lg">Información General</CardTitle>
        <CardDescription className="text-white/80 drop-shadow">Detalles principales de la liga</CardDescription>
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
            <Label htmlFor="name" className="text-white/90 drop-shadow">Nombre de la Liga</Label>
            <Input
              id="name"
              className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-lg"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
              disabled={update.isPending}
            />
            {errors.name && (
              <p id="name-error" className="text-xs text-red-300">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-white/90 drop-shadow">URL Slug</Label>
            <Input
              id="slug"
              className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-lg"
              forceLowercase
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="mi-liga"
              aria-invalid={!!errors.slug}
              aria-describedby={errors.slug ? 'slug-error' : undefined}
              disabled={update.isPending}
            />
            {errors.slug && (
              <p id="slug-error" className="text-xs text-red-300">
                {errors.slug}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/90 drop-shadow">Descripción</Label>
            <Textarea
              id="description"
              className="backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-lg"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe tu liga…"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
              disabled={update.isPending}
              rows={4}
            />
            {errors.description && (
              <p id="description-error" className="text-xs text-red-300">
                {errors.description}
              </p>
            )}
          </div>

          <Button type="submit" disabled={update.isPending} className="w-full sm:w-auto backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg">
            {update.isPending ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
