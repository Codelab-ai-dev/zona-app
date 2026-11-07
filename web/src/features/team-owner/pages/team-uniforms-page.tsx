import { useState } from 'react'
import { QueryState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

import { useTeam, useUpdateTeam } from '../api'

const colorFields = [
  { key: 'home_primary_color', label: 'Color Primario (Local)', category: 'local' },
  { key: 'home_secondary_color', label: 'Color Secundario (Local)', category: 'local' },
  { key: 'home_accent_color', label: 'Color Acentuado (Local)', category: 'local' },
  { key: 'away_primary_color', label: 'Color Primario (Visitante)', category: 'visitante' },
  { key: 'away_secondary_color', label: 'Color Secundario (Visitante)', category: 'visitante' },
  { key: 'away_accent_color', label: 'Color Acentuado (Visitante)', category: 'visitante' },
  { key: 'alt1_shorts_color', label: 'Shorts Alternativos 1', category: 'alternativo' },
  { key: 'alt2_shorts_color', label: 'Shorts Alternativos 2', category: 'alternativo' },
]

export function TeamUniformsPage({ teamId }: { teamId: string }) {
  const team = useTeam(teamId)
  const updateTeam = useUpdateTeam()

  // Derive initial colors from team data
  const initialColors = team.data
    ? Object.fromEntries(
        colorFields.map(({ key }) => {
          const value = (team.data as unknown as Record<string, unknown>)[key]
          return [key, typeof value === 'string' && value ? value : '#000000']
        }),
      )
    : Object.fromEntries(colorFields.map(({ key }) => [key, '#000000']))

  const [colors, setColors] = useState<Record<string, string>>(initialColors)
  const [isDirty, setIsDirty] = useState(false)

  const handleColorChange = (key: string, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    try {
      const updates: Record<string, string | null> = {}
      colorFields.forEach(({ key }) => {
        const colorValue = colors[key]
        updates[key] = colorValue === '#000000' && !(team.data as unknown as Record<string, unknown>)?.[key] ? null : (colorValue || null)
      })
      await updateTeam.mutateAsync({ teamId, data: updates })
      setIsDirty(false)
      toast.success('Uniformes actualizado')
    } catch (error) {
      toast.error('Error al actualizar uniformes')
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Uniformes</h2>
        <p className="text-muted-foreground">Personaliza los colores de los uniformes de tu equipo.</p>
      </div>

      <QueryState query={team} loadingLabel="Cargando información del equipo…">
        {() => (
          <div className="space-y-6">
            {['local', 'visitante', 'alternativo'].map((category) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle>
                    {category === 'local' && 'Uniforme Local'}
                    {category === 'visitante' && 'Uniforme Visitante'}
                    {category === 'alternativo' && 'Uniformes Alternativos'}
                  </CardTitle>
                  <CardDescription>
                    {category === 'local' && 'Colores del uniforme para partidos de local'}
                    {category === 'visitante' && 'Colores del uniforme para partidos de visitante'}
                    {category === 'alternativo' && 'Colores alternativos para casos especiales'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {colorFields
                    .filter((f) => f.category === category)
                    .map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-4">
                        <Label htmlFor={key} className="flex-1">
                          {label}
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            id={key}
                            type="color"
                            value={colors[key] ?? '#000000'}
                            onChange={(e) => handleColorChange(key, e.target.value)}
                            disabled={updateTeam.isPending}
                            className="h-10 w-16 cursor-pointer rounded border"
                          />
                          <Input
                            type="text"
                            value={colors[key] ?? ''}
                            onChange={(e) => handleColorChange(key, e.target.value)}
                            placeholder="#000000"
                            disabled={updateTeam.isPending}
                            className="w-24 font-mono text-sm"
                          />
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!isDirty || updateTeam.isPending} className="flex-1">
                {updateTeam.isPending ? 'Guardando…' : 'Guardar Cambios'}
              </Button>
              {isDirty && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setColors(initialColors)
                    setIsDirty(false)
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}
      </QueryState>
    </div>
  )
}
