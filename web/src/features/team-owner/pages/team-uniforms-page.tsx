import { useState } from 'react'
import { QueryState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { RotateCcw, Save, Shirt } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api/client'

import { useTeam, useUpdateTeam } from '../api'
import { glassCard, glassInput, pageSubtitle, pageTitle } from '../glass'
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
    <QueryState query={team} loadingLabel="Cargando información del equipo…">
      {(data) => <UniformsEditor team={data} />}
    </QueryState>
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

  const preview = (id: string) => {
    const shirt = colors[`${id}_primary_color` as ColorKey]
    return HEX.test(shirt ?? '') ? shirt : '#6b7280'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className={`${pageTitle} flex items-center`}>
            <Shirt className="w-6 h-6 mr-2" aria-hidden="true" />
            Gestión de Uniformes
          </h2>
          <p className={pageSubtitle}>Configura los colores de los uniformes de {team.name}</p>
        </div>

        <div className="flex space-x-2">
          {changed.length > 0 && (
            <Button
              variant="outline"
              disabled={updateTeam.isPending}
              onClick={() => {
                setColors(saved)
                setErrors({})
              }}
              className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
              Restablecer
            </Button>
          )}
          <Button
            onClick={() => void handleSave()}
            disabled={changed.length === 0 || updateTeam.isPending}
            className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg rounded-xl"
          >
            <Save className="w-4 h-4 mr-2" aria-hidden="true" />
            {updateTeam.isPending ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Card key={category.id} className={glassCard}>
            <CardHeader>
              <CardTitle className="flex items-center text-white drop-shadow-lg">
                <Shirt className="w-5 h-5 mr-2" aria-hidden="true" />
                {category.title}
              </CardTitle>
              <CardDescription className="text-white/70 drop-shadow">{category.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.id !== 'alternativo' && (
                <div className="flex justify-center mb-4">
                  <Shirt
                    className="w-12 h-12 sm:w-16 sm:h-16"
                    aria-hidden="true"
                    style={{ color: preview(category.id === 'local' ? 'home' : 'away'), stroke: '#000000', strokeWidth: '1' }}
                    fill="currentColor"
                  />
                </div>
              )}
              <div className="space-y-3">
                {colorFields
                  .filter((f) => f.category === category.id)
                  .map(({ key, label }) => (
                    <div key={key}>
                      <Label htmlFor={key} className="text-white drop-shadow">{label}</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          id={key}
                          type="color"
                          value={HEX.test(colors[key]) ? colors[key] : '#000000'}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          disabled={updateTeam.isPending}
                          className="w-12 h-10 rounded cursor-pointer bg-transparent border border-white/30"
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
                          className={`flex-1 min-w-0 font-mono text-sm rounded-xl ${glassInput}`}
                        />
                      </div>
                      {errors[key] && (
                        <p id={`${key}-error`} className="mt-1 text-sm text-red-400">
                          {errors[key]}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
