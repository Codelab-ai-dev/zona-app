import type { CreateTeamRequest, CreateUserRequest } from '../types'

export interface TeamData {
  name: string
  slug: string
  description: string
  /** Tournament id, or NO_TOURNAMENT. */
  tournamentId: string
}

export interface OwnerData {
  name: string
  email: string
  phone: string
}

export type FieldErrors = Record<string, string>

export const NO_TOURNAMENT = 'none'
export const emptyTeam: TeamData = { name: '', slug: '', description: '', tournamentId: NO_TOURNAMENT }
export const emptyOwner: OwnerData = { name: '', email: '', phone: '' }

/** Lowercase, accent-free, hyphenated slug ("Las Águilas" -> "las-aguilas"). */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/** Name is required; the slug may stay empty (it is generated from the name). */
export function validateTeam(team: TeamData): FieldErrors {
  const errors: FieldErrors = {}
  if (!team.name.trim()) errors.name = 'El nombre es requerido'
  return errors
}

export function validateOwner(owner: OwnerData): FieldErrors {
  const errors: FieldErrors = {}
  if (!owner.name.trim()) errors.ownerName = 'El nombre del propietario es requerido'
  if (!owner.email.trim()) errors.email = 'El email es requerido'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.email)) errors.email = 'Email inválido'
  return errors
}

const PASSWORD_CHARS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*'

/** Temporary owner password (12 characters, cryptographically random). */
export function generatePassword(length = 12): string {
  const values = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(values, (v) => PASSWORD_CHARS[v % PASSWORD_CHARS.length]).join('')
}

export function buildRequests(team: TeamData, owner: OwnerData, password: string, leagueId: string) {
  const teamReq: CreateTeamRequest = {
    name: team.name.trim(),
    slug: team.slug.trim() || slugify(team.name),
    league_id: leagueId,
    tournament_id: team.tournamentId === NO_TOURNAMENT ? undefined : team.tournamentId,
    description: team.description || undefined,
  }
  const ownerReq: CreateUserRequest = {
    name: owner.name.trim(),
    email: owner.email.trim(),
    password,
    phone: owner.phone || undefined,
    role: 'team_owner',
    league_id: leagueId,
  }
  return { team: teamReq, owner: ownerReq }
}

/** Server field names -> the dialog's field keys (owner "name" is "ownerName"). */
export function mapServerFields(fields: Record<string, string>, fromOwner: boolean): FieldErrors {
  const mapped: FieldErrors = {}
  for (const [key, message] of Object.entries(fields)) {
    mapped[fromOwner && key === 'name' ? 'ownerName' : key] = message
  }
  return mapped
}

/** Errors without the given field (used when the user edits that field). */
export function withoutError(errors: FieldErrors, key: string): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([k]) => k !== key))
}
