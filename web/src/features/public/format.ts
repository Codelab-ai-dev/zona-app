/** Formats a YYYY-MM-DD or RFC 3339 date as a calendar date (UTC, so it never shifts a day). */
export function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-MX', { timeZone: 'UTC' })
}

export type TournamentStatus = 'Finalizado' | 'En Curso' | 'Próximamente'

/** Compares calendar days (YYYY-MM-DD); the end day is inclusive. */
export function tournamentStatus(startDate: string, endDate: string, now: Date = new Date()): TournamentStatus {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const start = startDate.slice(0, 10)
  const end = endDate.slice(0, 10)
  if (today > end) return 'Finalizado'
  if (today >= start) return 'En Curso'
  return 'Próximamente'
}

export type TournamentLayout = 'league' | 'group_knockout' | 'knockout'

/** Public layout of a tournament; unknown formats (e.g. round_robin) behave as a league. */
export function tournamentLayout(format: string | undefined): TournamentLayout {
  return format === 'group_knockout' || format === 'knockout' ? format : 'league'
}
