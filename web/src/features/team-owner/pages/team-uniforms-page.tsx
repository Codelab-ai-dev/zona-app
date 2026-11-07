import { useState } from 'react'
import { QueryState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api/client'

import { useTeam, useUpdateTeam } from '../api'
import type { Team, UpdateTeamRequest } from '../types'

type ColorKey =
  | 'home_primary_color'
  | 'home_secondary_color'
  | 'home_accent_color'
  | 'away_primary_color'
  | 'away_secondary_color'
  | 'away_accent_color'
  | 'alt1_shorts_color'
  | 'alt2_shorts_color'

const colorFields: { key: ColorKey; label: string; category: string }[] = [
  { key: 'home_primary_color', label: 'Color Primario (Local)', category: 'local' },
  { key: 'home_secondary_color', label: 'Color Secundario (Local)', category: 'local' },
  { key: 'home_accent_color', label: 'Color Acentuado (Local)', category: 'local' },
  { key: 'away_primary_color', label: 'Color Primario (Visitante)', category: 'visitante' },
  { key: 'away_secondary_color', label: 'Color Secundario (Visitante)', category: 'visitante' },
  { key: 'away_accent_color', label: 'Color Acentuado (Visitante)', category: 'visitante' },
  { key: 'alt1_shorts_color', label: 'Shorts Alternativos 1', category: 'alternativo' },
  { key: 'alt2_shorts_color', label: 'Shorts Alternativos 2', category: 'alternativo' },
]

const categories = [
  { id: 'local', title: 'Uniforme Local', description: 'Colores del uniforme para partidos de local' },
  { id: 'visitante', title: 'Uniforme Visitante', description: 'Colores del uniforme para partidos de visitante' },
  { id: 'alternativo', title: 'Uniformes Alternativos', description: 'Colores alternativos para casos especiales' },
]

const HEX = /^#[0-9a-f]{6}$/i

export function TeamUniformsPage({ teamId }: { teamId: string }) {
  const team = useTeam(teamId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Uniformes</h2>
        <p className="text-muted-foreground">Personaliza los colores de los uniformes de tu equipo.</p>
      </div>

      <QueryState query={team} loadingLabel="Cargando información del equipo…">
        {(data) => <UniformsEditor team={data} />}
      </QueryState>
    </div>
  )
}

/** Mounted once the team is loaded, so the initial colors come from the API (not a placeholder). */
function UniformsEditor({ team }: { team: Team }) {
  const updateTeam = useUpdateTeam()
  const saved = Object.fromEntries(
    colorFields.map(({ key }) => [key, (team[key] as string | undefined) ?? '']),
  ) as Record<ColorKey, string>
  const [colors, setColors] = useState<Record<ColorKey, string>>(saved)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const changed = colorFields.filter(({ key }) => colors[key] !== saved[key])

  const handleColorChange = (key: ColorKey, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setErrors({})
    const data: UpdateTeamRequest = {}
    for (const { key } of changed) data[key] = colors[key]
    try {
      await updateTeam.mutateAsync({ teamId: team.id, data })
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) setErrors(error.fields)
    }
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader>
            <CardTitle>{category.title}</CardTitle>
            <CardDescription>{category.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {colorFields
              .filter((f) => f.category === category.id)
              .map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor={key} className="flex-1">
                      {label}
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        id={key}
                        type="color"
                        value={HEX.test(colors[key]) ? colors[key] : '#000000'}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        disabled={updateTeam.isPending}
                        className="h-10 w-16 cursor-pointer rounded border"
                      />
                      <Input
                        type="text"
                        aria-label={`${label} (hex)`}
                        value={colors[key]}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        placeholder="#000000"
                        disabled={updateTeam.isPending}
                        aria-invalid={Boolean(errors[key])}
                        aria-describedby={errors[key] ? `${key}-error` : undefined}
                        className="w-24 font-mono text-sm"
                      />
                    </div>
                  </div>
                  {errors[key] && (
                    <p id={`${key}-error`} className="mt-1 text-right text-sm text-destructive">
                      {errors[key]}
                    </p>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Button onClick={() => void handleSave()} disabled={changed.length === 0 || updateTeam.isPending} className="flex-1">
          {updateTeam.isPending ? 'Guardando…' : 'Guardar Cambios'}
        </Button>
        {changed.length > 0 && (
          <Button
            variant="outline"
            onClick={() => {
              setColors(saved)
              setErrors({})
            }}
          >
            Cancelar
          </Button>
        )}
      </div>
    </div>
  )
}
