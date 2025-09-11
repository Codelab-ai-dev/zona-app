/**
 * Utilidad para generar códigos QR de jugadores
 * Basado en el formato especificado por el usuario
 */

export interface PlayerQRCredential {
  typ: 'player-cred'
  ver: 1
  pid: string  // UUID del jugador
  lid: string  // UUID de la liga
  tid: string  // UUID del torneo
  season: string // Temporada (ej: "2025-A")
  num?: number  // Número de camiseta
  exp: number   // Timestamp de expiración
  nonce?: string // Nonce opcional para seguridad
}

export interface LegacyPlayerQR {
  type: 'player_verification'
  player_id: string
  player_name: string
  team_id: string
  timestamp: string
  version: '1.0'
}

/**
 * Genera un nonce aleatorio para seguridad adicional
 */
function generateNonce(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const random = Date.now()
  let nonce = ''
  
  for (let i = 0; i < length; i++) {
    nonce += chars[(random + i) % chars.length]
  }
  
  return nonce
}

/**
 * Genera credencial QR con el nuevo formato
 */
export function generatePlayerQRCredential({
  playerId,
  leagueId,
  tournamentId,
  season,
  jerseyNumber,
  customExpiration
}: {
  playerId: string
  leagueId: string
  tournamentId: string
  season: string
  jerseyNumber?: number
  customExpiration?: Date
}): PlayerQRCredential {
  // Si no se proporciona expiración, usar final de temporada (6 meses desde ahora)
  const expiration = customExpiration || new Date(Date.now() + (180 * 24 * 60 * 60 * 1000))
  
  const credential: PlayerQRCredential = {
    typ: 'player-cred',
    ver: 1,
    pid: playerId,
    lid: leagueId,
    tid: tournamentId,
    season,
    exp: Math.floor(expiration.getTime() / 1000), // Timestamp en segundos
    nonce: generateNonce()
  }

  if (jerseyNumber) {
    credential.num = jerseyNumber
  }

  return credential
}

/**
 * Genera QR con el formato legacy para compatibilidad
 */
export function generateLegacyPlayerQR({
  playerId,
  playerName,
  teamId
}: {
  playerId: string
  playerName: string
  teamId: string
}): LegacyPlayerQR {
  return {
    type: 'player_verification',
    player_id: playerId,
    player_name: playerName,
    team_id: teamId,
    timestamp: new Date().toISOString(),
    version: '1.0'
  }
}

/**
 * Convierte la credencial a string JSON para el QR
 */
export function credentialToQRString(credential: PlayerQRCredential | LegacyPlayerQR): string {
  return JSON.stringify(credential)
}

/**
 * Valida si una credencial QR es válida
 */
export function validatePlayerCredential(credential: PlayerQRCredential): {
  isValid: boolean
  error?: string
} {
  const now = Math.floor(Date.now() / 1000)
  
  if (credential.exp <= now) {
    return { isValid: false, error: 'Credencial expirada' }
  }
  
  if (credential.typ !== 'player-cred') {
    return { isValid: false, error: 'Tipo de credencial inválido' }
  }
  
  if (credential.ver !== 1) {
    return { isValid: false, error: 'Versión de credencial no soportada' }
  }
  
  if (!credential.pid || !credential.lid || !credential.tid || !credential.season) {
    return { isValid: false, error: 'Credencial incompleta' }
  }
  
  return { isValid: true }
}

/**
 * Calcula los días restantes hasta la expiración
 */
export function getDaysUntilExpiration(credential: PlayerQRCredential): number {
  const now = Math.floor(Date.now() / 1000)
  const secondsRemaining = credential.exp - now
  return Math.ceil(secondsRemaining / 86400) // 86400 segundos = 1 día
}

/**
 * Obtiene la fecha de expiración como Date
 */
export function getExpirationDate(credential: PlayerQRCredential): Date {
  return new Date(credential.exp * 1000)
}