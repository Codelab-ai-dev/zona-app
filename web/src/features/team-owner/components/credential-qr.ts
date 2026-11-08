import type { CoachingStaff, Player } from '../types'

/** Uppercase and strip accents, exactly like the mobile app's credential screen (_normalizeName). */
export function normalizeQrName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
}

/**
 * Player QR payload. Same JSON the mobile apps generate and parse
 * (zona_gol_mobile QRService): `player_id`, `player_name` and
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

/** Staff QR payload of the original app: {t:'s', i: id, n: name, r: role, tm: team}. */
export function buildStaffQrPayload(staff: CoachingStaff): string {
  return JSON.stringify({ t: 's', i: staff.id, n: staff.name, r: staff.role, tm: staff.team_id })
}

/** Credential-shaped view of a staff member (role as position, no jersey). */
export function staffAsCredentialPerson(staff: CoachingStaff): Player {
  return {
    id: staff.id,
    name: staff.name,
    team_id: staff.team_id,
    position: staff.role,
    jersey_number: 0,
    photo: staff.photo,
    is_active: staff.is_active,
    created_at: staff.created_at,
    updated_at: staff.updated_at,
    id_verified: false,
  }
}
