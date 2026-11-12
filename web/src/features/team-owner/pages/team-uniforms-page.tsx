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

/**
 * The 4 kits of the original model: local and visitante use primary (shirt) and
 * secondary (shorts); the alternates keep their shirt in the accent columns
 * (home_accent_color = alterna 1, away_accent_color = alterna 2).
 */
const kits: { id: string; title: string; description: string; shirt: ColorKey; shorts: ColorKey; shirtLabel: string; shortsLabel: string }[] = [
  { id: 'local', title: 'Uniforme Local', description: 'Colores para partidos en casa', shirt: 'home_primary_color', shorts: 'home_secondary_color', shirtLabel: 'Camiseta Local', shortsLabel: 'Short Local' },
  { id: 'visitante', title: 'Uniforme Visitante', description: 'Colores para partidos de visitante', shirt: 'away_primary_color', shorts: 'away_secondary_color', shirtLabel: 'Camiseta Visitante', shortsLabel: 'Short Visitante' },
  { id: 'alterna1', title: 'Alternativo 1', description: 'Primer uniforme alternativo', shirt: 'home_accent_color', shorts: 'alt1_shorts_color', shirtLabel: 'Camiseta alterna 1', shortsLabel: 'Shorts alterna 1' },
  { id: 'alterna2', title: 'Alternativo 2', description: 'Segundo uniforme alternativo', shirt: 'away_accent_color', shorts: 'alt2_shorts_color', shirtLabel: 'Camiseta alterna 2', shortsLabel: 'Shorts alterna 2' },
]

const colorFields = kits.flatMap((k) => [k.shirt, k.shorts])

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
    colorFields.map((key) => [key, (team[key] as string | undefined) ?? '']),
  ) as Record<ColorKey, string>
  const [colors, setColors] = useState<Record<ColorKey, string>>(saved)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const changed = colorFields.filter((key) => colors[key] !== saved[key])

  const handleColorChange = (key: ColorKey, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setErrors({})
    const data: UpdateTeamRequest = {}
    for (const key of changed) data[key] = colors[key]
    try {
      await updateTeam.mutateAsync({ teamId: team.id, data })
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) setErrors(error.fields)
    }
  }

  const preview = (key: ColorKey) => (HEX.test(colors[key] ?? '') ? colors[key] : '#6b7280')

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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kits.map((kit) => (
          <Card key={kit.id} className={glassCard}>
            <CardHeader>
              <CardTitle className="flex items-center text-white drop-shadow-lg">
                <Shirt className="w-5 h-5 mr-2" aria-hidden="true" />
                {kit.title}
              </CardTitle>
              <CardDescription className="text-white/70 drop-shadow">{kit.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center items-center gap-2 mb-4" aria-hidden="true">
                <Shirt
                  className="w-12 h-12 sm:w-16 sm:h-16"
                  style={{ color: preview(kit.shirt), stroke: '#000000', strokeWidth: '1' }}
                  fill="currentColor"
                />
                <span className="block w-8 h-6 rounded-sm border border-black" style={{ backgroundColor: preview(kit.shorts) }} />
              </div>
              <div className="space-y-3">
                {[
                  { key: kit.shirt, label: kit.shirtLabel },
                  { key: kit.shorts, label: kit.shortsLabel },
                ].map(({ key, label }) => (
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
