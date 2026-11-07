import type { Player } from '../types'

/** Uppercase and strip accents, exactly like the mobile app's credential screen (_normalizeName). */
export function normalizeQrName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

/**
 * Player QR payload. Same JSON the mobile apps generate and parse
 * (zona_gol_mobile QRService / Zona-G QRService): `player_id`, `player_name` and
 * `team_id` are mandatory for the scanner, `jersey_number` must be an int.
 * The old pipe format (`id|name|jersey`) is rejected by both apps (it needs the
 * team id as third part), so it must not be used.
 */
export function buildPlayerQrPayload(player: Player, opts: { leagueId?: string; now?: Date } = {}): string {
  return JSON.stringify({
    type: 'player_verification',
    player_id: player.id,
    player_name: normalizeQrName(player.name),
    team_id: player.team_id,
    jersey_number: player.jersey_number,
    ...(opts.leagueId ? { league_id: opts.leagueId } : {}),
    timestamp: (opts.now ?? new Date()).toISOString(),
    version: '1.0',
  })
}
