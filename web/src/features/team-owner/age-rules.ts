import type { Player, Tournament } from './types'

/** Port of the original lib/utils/age-utils.ts (same rules the API enforces). */
export interface AgeRules {
  enabled: boolean
  minAge: number | null
  maxAge: number | null
  referenceDate: string | null
  exceptionCount: number
  exceptionMinAge: number | null
  exceptionMaxAge: number | null
}

export interface AgeResult {
  isValid: boolean
  age: number
  isException: boolean
  reason?: string
}

export function rulesFromTournament(t: Tournament | undefined): AgeRules | null {
  if (!t) return null
  return {
    enabled: t.age_validation_enabled,
    minAge: t.min_age ?? null,
    maxAge: t.max_age ?? null,
    referenceDate: t.age_reference_date ? t.age_reference_date.slice(0, 10) : null,
    exceptionCount: t.age_exception_count ?? 0,
    exceptionMinAge: t.age_exception_min_age ?? null,
    exceptionMaxAge: t.age_exception_max_age ?? null,
  }
}

function parseDate(value: string): Date {
  const [year = 0, month = 1, day = 1] = value.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

function ageAt(birth: Date, ref: Date): number {
  let age = ref.getFullYear() - birth.getFullYear()
  const months = ref.getMonth() - birth.getMonth()
  if (months < 0 || (months === 0 && ref.getDate() < birth.getDate())) age--
  return age
}

export function validateAge(birthDate: string, rules: AgeRules, usedExceptions: number): AgeResult {
  const age = ageAt(parseDate(birthDate), rules.referenceDate ? parseDate(rules.referenceDate) : new Date())
  if (!rules.enabled) return { isValid: true, age, isException: false }

  const regular = (rules.minAge === null || age >= rules.minAge) && (rules.maxAge === null || age <= rules.maxAge)
  if (regular) return { isValid: true, age, isException: false }

  const available = rules.exceptionCount - usedExceptions
  if (available <= 0) {
    return { isValid: false, age, isException: false, reason: `No hay excepciones disponibles. El jugador tiene ${age} años.` }
  }
  const asException =
    (rules.exceptionMinAge === null || age >= rules.exceptionMinAge) && (rules.exceptionMaxAge === null || age <= rules.exceptionMaxAge)
  if (asException) {
    return {
      isValid: true,
      age,
      isException: true,
      reason: `Jugador de ${age} años registrado como excepción (${available - 1} excepciones restantes).`,
    }
  }

  let reason = `El jugador tiene ${age} años.`
  if (rules.minAge !== null && age < rules.minAge) reason += ` Se requiere mínimo ${rules.minAge} años.`
  if (rules.maxAge !== null && age > rules.maxAge) reason += ` Se permite máximo ${rules.maxAge} años.`
  if (rules.exceptionMinAge !== null || rules.exceptionMaxAge !== null) {
    reason += ' Excepciones permitidas: '
    if (rules.exceptionMinAge !== null) reason += `mínimo ${rules.exceptionMinAge} años`
    if (rules.exceptionMaxAge !== null) reason += `${rules.exceptionMinAge !== null ? ', ' : ''}máximo ${rules.exceptionMaxAge} años`
    reason += '.'
  }
  return { isValid: false, age, isException: false, reason }
}

export function describeAgeRules(rules: AgeRules): string {
  if (!rules.enabled) return 'Sin restricción de edad'
  const parts: string[] = []
  if (rules.minAge !== null && rules.maxAge !== null) parts.push(`Edad: ${rules.minAge}-${rules.maxAge} años`)
  else if (rules.minAge !== null) parts.push(`Mayores de ${rules.minAge} años`)
  else if (rules.maxAge !== null) parts.push(`Menores de ${rules.maxAge} años`)
  if (rules.exceptionCount > 0) {
    let text = `${rules.exceptionCount} excepcion${rules.exceptionCount > 1 ? 'es' : ''}`
    if (rules.exceptionMinAge !== null) text += ` (mín. ${rules.exceptionMinAge} años)`
    parts.push(text)
  }
  if (rules.referenceDate) parts.push(`Ref: ${parseDate(rules.referenceDate).toLocaleDateString('es-MX')}`)
  return parts.join(' | ')
}

/** Exceptions already used by the team's players (the one being edited is excluded). */
export function countUsedExceptions(players: Player[], rules: AgeRules | null, excludeId?: string): number {
  if (!rules?.enabled) return 0
  return players.filter((p) => p.is_active && p.id !== excludeId && p.birth_date && validateAge(p.birth_date, rules, 0).isException).length
}
