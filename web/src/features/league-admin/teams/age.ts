import type { Tournament } from '@/features/leagues/types'

export type AgeRules = Pick<Tournament, 'age_validation_enabled' | 'min_age' | 'max_age' | 'age_reference_date'>

/** Full years on `reference` for a YYYY-MM-DD birth date (no timezone shifts). */
export function ageOn(birthDate: string, reference: Date): number | null {
  const [y, m, d] = birthDate.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  let age = reference.getFullYear() - y
  const before = reference.getMonth() + 1 < m || (reference.getMonth() + 1 === m && reference.getDate() < d)
  if (before) age--
  return age
}

function parseDay(value: string): Date {
  const [y = 0, m = 1, d = 1] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Age of the player with the tournament's rule applied: `ok` is null when the
 * tournament has no age validation (nothing to judge).
 */
export function checkAge(birthDate: string | undefined, rules: AgeRules | undefined, today = new Date()) {
  if (!birthDate) return null
  const reference = rules?.age_reference_date ? parseDay(rules.age_reference_date) : today
  const age = ageOn(birthDate, reference)
  if (age === null) return null
  if (!rules?.age_validation_enabled) return { age, ok: null }
  const ok = (rules.min_age == null || age >= rules.min_age) && (rules.max_age == null || age <= rules.max_age)
  return { age, ok }
}
