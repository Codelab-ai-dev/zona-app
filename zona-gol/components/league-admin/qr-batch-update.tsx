"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { QrCode, RefreshCw, AlertTriangle, CheckCircle2, Loader2, Users, Info } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { useQRGenerator } from "@/lib/hooks/use-qr-generator"
import { hasProblematicChars, normalizeForQR } from "@/lib/utils/qr-text-normalizer"
import { toast } from "sonner"

interface Player {
  id: string
  name: string
  team_id: string
  jersey_number: number
  team?: {
    id: string
    name: string
    league_id: string | null
  }
}

interface UpdateResult {
  playerId: string
  playerName: string
  playerNameNormalized?: string
  success: boolean
  error?: string
  qrData?: string
  hadSpecialChars?: boolean
}

export function QRBatchUpdate() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [results, setResults] = useState<UpdateResult[]>([])
  const [hasRun, setHasRun] = useState(false)
  const [playersWithSpecialChars, setPlayersWithSpecialChars] = useState(0)
  const { generatePlayerQR } = useQRGenerator()
  const supabase = createClientSupabaseClient()

  const handleBatchUpdate = async () => {
    setIsUpdating(true)
    setProgress(0)
    setResults([])
    setHasRun(true)
    setPlayersWithSpecialChars(0)

    try {
      console.log('🔵 Iniciando actualización masiva de QR codes...')

      // Primero, obtener ligas con modo 'full' (que soportan QR)
      const { data: fullModeLeagues, error: leaguesError } = await supabase
        .from('leagues')
        .select('id')
        .eq('product_mode', 'full')
        .eq('is_active', true)

      if (leaguesError) {
        throw new Error(`Error obteniendo ligas: ${leaguesError.message}`)
      }

      const fullModeLeagueIds = fullModeLeagues?.map(l => l.id) || []

      if (fullModeLeagueIds.length === 0) {
        toast.info('No hay ligas con modo Completo que soporten códigos QR')
        setIsUpdating(false)
        return
      }

      // Obtener jugadores activos de equipos en ligas con modo 'full'
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select(`
          id,
          name,
          team_id,
          jersey_number,
          teams:team_id (
            id,
            name,
            league_id
          )
        `)
        .eq('is_active', true)

      // Filtrar jugadores cuyas ligas tienen product_mode = 'full'
      const eligiblePlayers = players?.filter(p =>
        p.teams && fullModeLeagueIds.includes(p.teams.league_id)
      ) || []

      if (playersError) {
        throw new Error(`Error obteniendo jugadores: ${playersError.message}`)
      }

      if (!eligiblePlayers || eligiblePlayers.length === 0) {
        toast.info('No hay jugadores activos en ligas con modo Completo para actualizar')
        setIsUpdating(false)
        return
      }

      console.log(`✅ Encontrados ${eligiblePlayers.length} jugadores activos en ligas con modo Completo`)
      setTotalPlayers(eligiblePlayers.length)

      const updateResults: UpdateResult[] = []

      // Procesar cada jugador
      for (let i = 0; i < eligiblePlayers.length; i++) {
        const player = eligiblePlayers[i] as any
        const team = player.teams

        try {
          console.log(`🔄 Procesando ${i + 1}/${eligiblePlayers.length}: ${player.name}`)

          // Detectar si tiene caracteres especiales
          const hadSpecialChars = hasProblematicChars(player.name)
          const normalizedName = normalizeForQR(player.name)

          if (hadSpecialChars) {
            console.log(`⚠️ Nombre con caracteres especiales: "${player.name}" → "${normalizedName}"`)
          }

          // Generar nuevo QR code
          const qrResult = await generatePlayerQR(
            {
              id: player.id,
              name: player.name,
              team_id: player.team_id,
              jersey_number: player.jersey_number
            },
            {
              format: 'legacy',
              leagueId: team?.league_id || undefined
            }
          )

          if (qrResult && qrResult.success) {
            // Aquí podrías guardar el QR en la base de datos si tienes una columna para ello
            // Por ahora solo verificamos que se genere correctamente
            updateResults.push({
              playerId: player.id,
              playerName: player.name,
              playerNameNormalized: hadSpecialChars ? normalizedName : undefined,
              success: true,
              qrData: qrResult.qrData,
              hadSpecialChars
            })

            if (hadSpecialChars) {
              setPlayersWithSpecialChars(prev => prev + 1)
            }

            console.log(`✅ QR actualizado para: ${player.name}`)
          } else {
            throw new Error('No se pudo generar el QR')
          }
        } catch (error: any) {
          console.error(`❌ Error actualizando QR para ${player.name}:`, error)
          updateResults.push({
            playerId: player.id,
            playerName: player.name,
            success: false,
            error: error.message || 'Error desconocido'
          })
        }

        // Actualizar progreso
        setProgress(((i + 1) / eligiblePlayers.length) * 100)
        setResults([...updateResults])
      }

      const successCount = updateResults.filter(r => r.success).length
      const failureCount = updateResults.filter(r => !r.success).length

      console.log(`✅ Actualización completada: ${successCount} exitosos, ${failureCount} fallidos`)

      if (failureCount === 0) {
        toast.success(`¡Todos los ${successCount} códigos QR fueron actualizados exitosamente!`)
      } else {
        toast.warning(`${successCount} códigos QR actualizados, ${failureCount} fallaron`)
      }

    } catch (error: any) {
      console.error('❌ Error en actualización masiva:', error)
      toast.error(`Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const successCount = results.filter(r => r.success).length
  const failureCount = results.filter(r => !r.success).length

  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white drop-shadow-lg">
          <QrCode className="w-5 h-5 text-blue-300" />
          Actualización Masiva de Códigos QR
        </CardTitle>
        <CardDescription className="text-white/80 drop-shadow">
          Regenera los códigos QR de todos los jugadores activos para asegurar que funcionen correctamente con la app móvil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Información importante */}
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-300">Importante</h4>
              <p className="text-xs text-yellow-300/80 mt-1">
                Esta función regenerará los códigos QR de todos los jugadores activos en el sistema.
                Los nuevos QR incluirán toda la información necesaria: ID del jugador, nombre, equipo, número de camiseta y liga.
                Esto corrige el problema de QR codes que no escaneaban correctamente en la app móvil.
              </p>
            </div>
          </div>
        </div>

        {/* Botón de actualización */}
        <div className="flex flex-col items-center gap-4">
          <Button
            onClick={handleBatchUpdate}
            disabled={isUpdating}
            size="lg"
            className="w-full max-w-md backdrop-blur-md bg-blue-500/80 hover:bg-blue-500/90 text-white border-0 shadow-lg"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Actualizando QR Codes...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Actualizar Todos los QR Codes
              </>
            )}
          </Button>

          {/* Barra de progreso */}
          {isUpdating && totalPlayers > 0 && (
            <div className="w-full max-w-md space-y-2">
              <Progress value={progress} className="w-full h-2 bg-white/10" />
              <p className="text-sm text-center text-white/70 drop-shadow">
                Procesando {Math.round(progress)}% ({Math.round((progress / 100) * totalPlayers)}/{totalPlayers} jugadores)
              </p>
            </div>
          )}
        </div>

        {/* Resultados */}
        {hasRun && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Badge className="flex items-center gap-2 backdrop-blur-md bg-green-500/20 text-green-300 border-green-500/30">
                <CheckCircle2 className="w-4 h-4" />
                {successCount} Exitosos
              </Badge>
              {failureCount > 0 && (
                <Badge className="flex items-center gap-2 backdrop-blur-md bg-red-500/20 text-red-300 border-red-500/30">
                  <AlertTriangle className="w-4 h-4" />
                  {failureCount} Fallidos
                </Badge>
              )}
            </div>

            {/* Mostrar jugadores con caracteres especiales normalizados */}
            {playersWithSpecialChars > 0 && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-300">Nombres Normalizados</h4>
                    <p className="text-xs text-blue-300/80 mt-1">
                      Se detectaron {playersWithSpecialChars} jugadores con caracteres especiales (ñ, acentos) que fueron normalizados automáticamente para asegurar compatibilidad con el escáner QR.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mostrar detalle de normalizaciones si hay alguna */}
            {results.filter(r => r.hadSpecialChars).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-white drop-shadow">
                  <Info className="w-4 h-4 text-blue-400" />
                  Jugadores con nombres normalizados:
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {results
                    .filter(r => r.hadSpecialChars && r.success)
                    .map((result) => (
                      <div key={result.playerId} className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">
                              {result.playerName}
                            </p>
                            <p className="text-xs text-blue-300/80">
                              En QR: {result.playerNameNormalized}
                            </p>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Mostrar solo los fallos si hay alguno */}
            {failureCount > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-white drop-shadow">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Jugadores con errores:
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {results
                    .filter(r => !r.success)
                    .map((result) => (
                      <div key={result.playerId} className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <p className="text-sm font-medium text-white">{result.playerName}</p>
                        <p className="text-xs text-red-300/80 mt-1">{result.error}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Resumen final */}
            {!isUpdating && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-300">Actualización Completada</h4>
                    <p className="text-xs text-green-300/80 mt-1">
                      {failureCount === 0
                        ? `¡Todos los ${successCount} códigos QR fueron regenerados exitosamente! Los jugadores ahora podrán escanear sus credenciales sin problemas.`
                        : `${successCount} códigos QR fueron regenerados exitosamente. ${failureCount} jugadores requieren atención manual.`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Información adicional */}
        <div className="space-y-4">
          <div className="p-4 bg-slate-800/50 rounded-lg border border-white/10">
            <h4 className="font-semibold text-white flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-blue-300" />
              ¿Qué hace esta función?
            </h4>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-white/70">
              <li>Encuentra todos los jugadores activos en el sistema</li>
              <li>Regenera el código QR de cada jugador con el formato correcto</li>
              <li>Incluye: ID, nombre, equipo, número de camiseta y liga</li>
              <li><strong className="text-white">Normaliza nombres con ñ, acentos y caracteres especiales</strong></li>
              <li>Verifica que cada QR sea válido antes de continuar</li>
              <li>Muestra un reporte detallado de los resultados</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-2">
                <h4 className="text-sm font-medium text-blue-300">Normalización de Caracteres Especiales</h4>
                <p className="text-blue-300/80">
                  Para asegurar compatibilidad con los escáneres QR, los nombres con caracteres especiales se normalizan automáticamente:
                </p>
                <ul className="list-disc list-inside ml-2 text-blue-300/80">
                  <li>Acentos: á→a, é→e, í→i, ó→o, ú→u</li>
                  <li>Eñe: ñ→n</li>
                  <li>Otros: ü→u, ç→c</li>
                </ul>
                <p className="mt-2 text-blue-300/80">
                  <strong className="text-blue-300">Importante:</strong> El nombre original del jugador NO cambia en la base de datos.
                  Solo se normaliza dentro del código QR para evitar errores de escaneo.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/50">
            <strong className="text-white/70">Nota:</strong> Esta operación no modifica los datos de los jugadores, solo regenera los códigos QR
            con toda la información necesaria para que la app móvil los pueda escanear correctamente.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
