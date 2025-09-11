import { useState } from 'react'
import { 
  generatePlayerQRCredential, 
  generateLegacyPlayerQR, 
  credentialToQRString,
  PlayerQRCredential,
  LegacyPlayerQR
} from '@/lib/utils/qr-generator'

interface Player {
  id: string
  name: string
  team_id: string
  jersey_number: number
}

interface QRGenerationOptions {
  format: 'new' | 'legacy'
  leagueId?: string
  tournamentId?: string
  season?: string
  customExpiration?: Date
}

export function useQRGenerator() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generatePlayerQR = async (
    player: Player, 
    options: QRGenerationOptions = { format: 'new' }
  ): Promise<{
    qrData: string
    credential: PlayerQRCredential | LegacyPlayerQR
    success: boolean
  } | null> => {
    setGenerating(true)
    setError(null)

    try {
      let credential: PlayerQRCredential | LegacyPlayerQR
      
      if (options.format === 'legacy') {
        // Generar QR con formato legacy para compatibilidad
        credential = generateLegacyPlayerQR({
          playerId: player.id,
          playerName: player.name,
          teamId: player.team_id
        })
      } else {
        // Generar QR con nuevo formato
        if (!options.leagueId || !options.tournamentId || !options.season) {
          throw new Error('Se requieren leagueId, tournamentId y season para el nuevo formato')
        }
        
        credential = generatePlayerQRCredential({
          playerId: player.id,
          leagueId: options.leagueId,
          tournamentId: options.tournamentId,
          season: options.season,
          jerseyNumber: player.jersey_number,
          customExpiration: options.customExpiration
        })
      }

      const qrData = credentialToQRString(credential)
      
      console.log('✅ QR generado exitosamente para jugador:', player.name)
      console.log('📋 Datos QR:', qrData)

      return {
        qrData,
        credential,
        success: true
      }
    } catch (error: any) {
      console.error('❌ Error generando QR:', error)
      setError(error.message || 'Error generando código QR')
      return null
    } finally {
      setGenerating(false)
    }
  }

  const generateMultiplePlayerQRs = async (
    players: Player[],
    options: QRGenerationOptions = { format: 'new' }
  ): Promise<Array<{
    player: Player
    qrData: string
    credential: PlayerQRCredential | LegacyPlayerQR
    success: boolean
  }>> => {
    setGenerating(true)
    setError(null)

    const results = []

    try {
      for (const player of players) {
        const result = await generatePlayerQR(player, options)
        if (result) {
          results.push({
            player,
            ...result
          })
        } else {
          results.push({
            player,
            qrData: '',
            credential: {} as any,
            success: false
          })
        }
      }

      console.log(`✅ Generados ${results.filter(r => r.success).length}/${players.length} QRs`)
      return results
    } catch (error: any) {
      console.error('❌ Error generando QRs múltiples:', error)
      setError(error.message || 'Error generando códigos QR')
      return []
    } finally {
      setGenerating(false)
    }
  }

  const clearError = () => setError(null)

  return {
    generatePlayerQR,
    generateMultiplePlayerQRs,
    generating,
    error,
    clearError
  }
}