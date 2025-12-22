"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shirt, Save, RotateCcw, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { GiUnderwearShorts } from "react-icons/gi"
import { useTeamById, useUpdateTeam } from "@/lib/queries"

interface TeamUniformsProps {
  teamId: string
}

interface UniformColors {
  home_shirt_color: string
  home_shorts_color: string
  away_shirt_color: string
  away_shorts_color: string
  alt1_shirt_color: string
  alt1_shorts_color: string
  alt2_shirt_color: string
  alt2_shorts_color: string
}

const defaultColors: UniformColors = {
  home_shirt_color: "#3B82F6", // Blue shirt
  home_shorts_color: "#FFFFFF", // White shorts
  away_shirt_color: "#EF4444", // Red shirt
  away_shorts_color: "#FFFFFF", // White shorts
  alt1_shirt_color: "#10B981", // Green shirt
  alt1_shorts_color: "#1F2937", // Dark shorts
  alt2_shirt_color: "#F59E0B", // Orange shirt
  alt2_shorts_color: "#1F2937", // Dark shorts
}

export function TeamUniforms({ teamId }: TeamUniformsProps) {
  // React Query hooks
  const { data: team, isLoading, error: teamError } = useTeamById(teamId)
  const updateMutation = useUpdateTeam()

  const [colors, setColors] = useState<UniformColors>(defaultColors)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize colors from team data
  useEffect(() => {
    if (team) {
      const uniformColors: UniformColors = {
        home_shirt_color: team.home_primary_color || defaultColors.home_shirt_color,
        home_shorts_color: team.home_secondary_color || defaultColors.home_shorts_color,
        away_shirt_color: team.away_primary_color || defaultColors.away_shirt_color,
        away_shorts_color: team.away_secondary_color || defaultColors.away_shorts_color,
        alt1_shirt_color: team.home_accent_color || defaultColors.alt1_shirt_color,
        alt1_shorts_color: defaultColors.alt1_shorts_color,
        alt2_shirt_color: team.away_accent_color || defaultColors.alt2_shirt_color,
        alt2_shorts_color: defaultColors.alt2_shorts_color,
      }
      setColors(uniformColors)
    }
  }, [team])

  const handleColorChange = (field: keyof UniformColors, value: string) => {
    setColors(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleSaveColors = async () => {
    if (!team) return

    try {
      // Log colors before update for debugging
      console.log('🎨 Saving uniform colors:', {
        home_shirt: colors.home_shirt_color,
        home_shorts: colors.home_shorts_color,
        away_shirt: colors.away_shirt_color,
        away_shorts: colors.away_shorts_color,
        alt1_shirt: colors.alt1_shirt_color,
        alt1_shorts: colors.alt1_shorts_color,
        alt2_shirt: colors.alt2_shirt_color,
        alt2_shorts: colors.alt2_shorts_color,
      })

      // Update team with new uniform colors (mapping to existing DB fields)
      const updateData = {
        home_primary_color: colors.home_shirt_color,
        home_secondary_color: colors.home_shorts_color,
        home_accent_color: colors.alt1_shirt_color, // Store alt1 shirt color
        away_primary_color: colors.away_shirt_color,
        away_secondary_color: colors.away_shorts_color,
        away_accent_color: colors.alt2_shirt_color, // Store alt2 shirt color
      }

      console.log('📤 Update data to send:', updateData)

      await updateMutation.mutateAsync({ teamId: team.id, updates: updateData })

      setHasChanges(false)
      toast.success("Colores de uniformes guardados exitosamente", {
        icon: <CheckCircle className="w-4 h-4" />
      })

      console.log('✅ Uniform colors saved successfully')
    } catch (error) {
      console.error('Error saving uniform colors:', error)
      toast.error("Error al guardar los colores de uniformes", {
        icon: <AlertCircle className="w-4 h-4" />
      })
    }
  }

  const handleResetColors = () => {
    setColors(defaultColors)
    setHasChanges(true)
  }

  const saving = updateMutation.isPending

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-2 text-white" />
          <span className="text-white drop-shadow">Cargando configuración de uniformes...</span>
        </div>
      </div>
    )
  }

  if (teamError || !team) {
    return (
      <div className="space-y-6">
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-white mb-2 drop-shadow-lg">Error</h3>
            <p className="text-red-400 drop-shadow">{teamError?.message || 'Equipo no encontrado'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg flex items-center">
            <Shirt className="w-6 h-6 mr-2" />
            Gestión de Uniformes
          </h2>
          <p className="text-white/80 drop-shadow">
            Configura los colores de los uniformes de {team.name}
          </p>
        </div>

        {hasChanges && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleResetColors}
              disabled={saving}
              className="backdrop-blur-md bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restablecer
            </Button>
            <Button
              onClick={handleSaveColors}
              disabled={saving}
              className="backdrop-blur-md bg-green-500/80 hover:bg-green-500/90 text-white border-0 shadow-lg rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Uniform Previews */}
      <div className="grid gap-4 sm:gap-4 sm:p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Home Uniform */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-white drop-shadow-lg">
              <Shirt className="w-5 h-5 mr-2" />
              Uniforme Local
            </CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Colores para partidos en casa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Home Uniform Preview */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="flex flex-col items-center space-y-1">
                  {/* Shirt */}
                  <div className="relative">
                    <Shirt
                      className="w-12 h-12 sm:w-16 sm:h-16"
                      style={{
                        color: colors.home_shirt_color,
                        stroke: "#000000",
                        strokeWidth: "1"
                      }}
                      fill="currentColor"
                    />
                  </div>
                  {/* Shorts */}
                  <GiUnderwearShorts
                    size={50}
                    style={{
                      color: colors.home_shorts_color,
                      stroke: "#000000",
                      strokeWidth: "10"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Home Color Controls */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="home-shirt" className="text-white drop-shadow">Color de Camiseta</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="home-shirt"
                    type="color"
                    value={colors.home_shirt_color}
                    onChange={(e) => handleColorChange('home_shirt_color', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors.home_shirt_color}
                    onChange={(e) => handleColorChange('home_shirt_color', e.target.value)}
                    className="flex-1 font-mono text-sm backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="home-shorts" className="text-white drop-shadow">Color de Short</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="home-shorts"
                    type="color"
                    value={colors.home_shorts_color}
                    onChange={(e) => handleColorChange('home_shorts_color', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors.home_shorts_color}
                    onChange={(e) => handleColorChange('home_shorts_color', e.target.value)}
                    className="flex-1 font-mono text-sm backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Away Uniform */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-white drop-shadow-lg">
              <Shirt className="w-5 h-5 mr-2" />
              Uniforme Visitante
            </CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Colores para partidos fuera de casa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Away Uniform Preview */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="flex flex-col items-center space-y-1">
                  {/* Shirt */}
                  <div className="relative">
                    <Shirt
                      className="w-12 h-12 sm:w-16 sm:h-16"
                      style={{
                        color: colors.away_shirt_color,
                        stroke: "#000000",
                        strokeWidth: "1"
                      }}
                      fill="currentColor"
                    />
                  </div>
                  {/* Shorts */}
                  <GiUnderwearShorts
                    size={50}
                    style={{
                      color: colors.away_shorts_color,
                      stroke: "#000000",
                      strokeWidth: "8"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Away Color Controls */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="away-shirt" className="text-white drop-shadow">Color de Camiseta</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="away-shirt"
                    type="color"
                    value={colors.away_shirt_color}
                    onChange={(e) => handleColorChange('away_shirt_color', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors.away_shirt_color}
                    onChange={(e) => handleColorChange('away_shirt_color', e.target.value)}
                    className="flex-1 font-mono text-sm backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                    placeholder="#EF4444"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="away-shorts" className="text-white drop-shadow">Color de Short</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="away-shorts"
                    type="color"
                    value={colors.away_shorts_color}
                    onChange={(e) => handleColorChange('away_shorts_color', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors.away_shorts_color}
                    onChange={(e) => handleColorChange('away_shorts_color', e.target.value)}
                    className="flex-1 font-mono text-sm backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alternate Uniform 1 */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-white drop-shadow-lg">
              <Shirt className="w-5 h-5 mr-2" />
              Alternativo 1
            </CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Primer uniforme alternativo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alt1 Uniform Preview */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="flex flex-col items-center space-y-1">
                  {/* Shirt */}
                  <div className="relative">
                    <Shirt
                      className="w-12 h-12 sm:w-16 sm:h-16"
                      style={{
                        color: colors.alt1_shirt_color,
                        stroke: "#000000",
                        strokeWidth: "1"
                      }}
                      fill="currentColor"
                    />
                  </div>
                  {/* Shorts */}
                  <GiUnderwearShorts
                    size={50}
                    style={{
                      color: colors.alt1_shorts_color,
                      stroke: "#000000",
                      strokeWidth: "8"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Alt1 Color Controls */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="alt1-shirt" className="text-white drop-shadow">Color de Camiseta</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="alt1-shirt"
                    type="color"
                    value={colors.alt1_shirt_color}
                    onChange={(e) => handleColorChange('alt1_shirt_color', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors.alt1_shirt_color}
                    onChange={(e) => handleColorChange('alt1_shirt_color', e.target.value)}
                    className="flex-1 font-mono text-sm backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                    placeholder="#10B981"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="alt1-shorts" className="text-white drop-shadow">Color de Short</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="alt1-shorts"
                    type="color"
                    value={colors.alt1_shorts_color}
                    onChange={(e) => handleColorChange('alt1_shorts_color', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors.alt1_shorts_color}
                    onChange={(e) => handleColorChange('alt1_shorts_color', e.target.value)}
                    className="flex-1 font-mono text-sm backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                    placeholder="#1F2937"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alternate Uniform 2 */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-white drop-shadow-lg">
              <Shirt className="w-5 h-5 mr-2" />
              Alternativo 2
            </CardTitle>
            <CardDescription className="text-white/70 drop-shadow">Segundo uniforme alternativo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alt2 Uniform Preview */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="flex flex-col items-center space-y-1">
                  {/* Shirt */}
                  <div className="relative">
                    <Shirt
                      className="w-12 h-12 sm:w-16 sm:h-16"
                      style={{
                        color: colors.alt2_shirt_color,
                        stroke: "#000000",
                        strokeWidth: "1"
                      }}
                      fill="currentColor"
                    />
                  </div>
                  {/* Shorts */}
                  <GiUnderwearShorts
                    size={50}
                    style={{
                      color: colors.alt2_shorts_color,
                      stroke: "#000000",
                      strokeWidth: "8"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Alt2 Color Controls */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="alt2-shirt" className="text-white drop-shadow">Color de Camiseta</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="alt2-shirt"
                    type="color"
                    value={colors.alt2_shirt_color}
                    onChange={(e) => handleColorChange('alt2_shirt_color', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors.alt2_shirt_color}
                    onChange={(e) => handleColorChange('alt2_shirt_color', e.target.value)}
                    className="flex-1 font-mono text-sm backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                    placeholder="#F59E0B"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="alt2-shorts" className="text-white drop-shadow">Color de Short</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="alt2-shorts"
                    type="color"
                    value={colors.alt2_shorts_color}
                    onChange={(e) => handleColorChange('alt2_shorts_color', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colors.alt2_shorts_color}
                    onChange={(e) => handleColorChange('alt2_shorts_color', e.target.value)}
                    className="flex-1 font-mono text-sm backdrop-blur-md bg-white/10 border-white/30 text-white placeholder:text-white/50 rounded-xl"
                    placeholder="#1F2937"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Information Card */}
      <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
        <CardContent className="pt-6">
          <div className="backdrop-blur-md bg-blue-500/20 border border-blue-300/30 rounded-xl p-4 shadow-lg">
            <h4 className="font-medium text-white mb-2 drop-shadow-lg">Consejos para elegir colores</h4>
            <ul className="text-sm text-white/80 drop-shadow space-y-1">
              <li>• <strong>Color de Camiseta:</strong> Color principal del uniforme</li>
              <li>• <strong>Color de Short:</strong> Color de los pantalones cortos</li>
              <li>• Asegúrate de que haya buen contraste entre colores para mejor visibilidad</li>
              <li>• Los uniformes local y visitante deben ser suficientemente diferentes</li>
              <li>• Puedes usar el mismo color para ambas prendas o combinar diferentes tonos</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
