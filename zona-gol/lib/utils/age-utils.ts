/**
 * Age validation utilities for tournament player registration
 */

export interface AgeValidationRules {
  age_validation_enabled: boolean
  min_age: number | null
  max_age: number | null
  age_reference_date: string | null
  age_exception_count: number
  age_exception_min_age: number | null
  age_exception_max_age: number | null
}

export interface AgeValidationResult {
  isValid: boolean
  age: number
  meetsRegularRequirements: boolean
  isException: boolean
  reason?: string
}

/**
 * Calculate age at a given reference date
 */
export function calculateAge(birthDate: Date, referenceDate: Date): number {
  let age = referenceDate.getFullYear() - birthDate.getFullYear()
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

/**
 * Parse a date string (YYYY-MM-DD) to a Date object
 */
export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Validate if a player meets the age requirements for a tournament
 */
export function validatePlayerAge(
  birthDateString: string,
  rules: AgeValidationRules,
  usedExceptions: number = 0
): AgeValidationResult {
  // If age validation is not enabled, always valid
  if (!rules.age_validation_enabled) {
    const birthDate = parseDate(birthDateString)
    const referenceDate = rules.age_reference_date
      ? parseDate(rules.age_reference_date)
      : new Date()

    return {
      isValid: true,
      age: calculateAge(birthDate, referenceDate),
      meetsRegularRequirements: true,
      isException: false,
    }
  }

  const birthDate = parseDate(birthDateString)
  const referenceDate = rules.age_reference_date
    ? parseDate(rules.age_reference_date)
    : new Date()

  const age = calculateAge(birthDate, referenceDate)

  // Check if meets regular age requirements
  const meetsMinAge = rules.min_age === null || age >= rules.min_age
  const meetsMaxAge = rules.max_age === null || age <= rules.max_age
  const meetsRegularRequirements = meetsMinAge && meetsMaxAge

  if (meetsRegularRequirements) {
    return {
      isValid: true,
      age,
      meetsRegularRequirements: true,
      isException: false,
    }
  }

  // Check if qualifies as an exception
  const availableExceptions = rules.age_exception_count - usedExceptions
  if (availableExceptions <= 0) {
    return {
      isValid: false,
      age,
      meetsRegularRequirements: false,
      isException: false,
      reason: `No hay excepciones disponibles. El jugador tiene ${age} años.`,
    }
  }

  const meetsExceptionMinAge = rules.age_exception_min_age === null || age >= rules.age_exception_min_age
  const meetsExceptionMaxAge = rules.age_exception_max_age === null || age <= rules.age_exception_max_age
  const qualifiesAsException = meetsExceptionMinAge && meetsExceptionMaxAge

  if (qualifiesAsException) {
    return {
      isValid: true,
      age,
      meetsRegularRequirements: false,
      isException: true,
      reason: `Jugador de ${age} años registrado como excepción (${availableExceptions - 1} excepciones restantes).`,
    }
  }

  // Doesn't meet any requirements
  let reason = `El jugador tiene ${age} años.`
  if (rules.min_age !== null && age < rules.min_age) {
    reason += ` Se requiere mínimo ${rules.min_age} años.`
  }
  if (rules.max_age !== null && age > rules.max_age) {
    reason += ` Se permite máximo ${rules.max_age} años.`
  }
  if (rules.age_exception_min_age !== null || rules.age_exception_max_age !== null) {
    reason += ` Excepciones permitidas: `
    if (rules.age_exception_min_age !== null) {
      reason += `mínimo ${rules.age_exception_min_age} años`
    }
    if (rules.age_exception_max_age !== null) {
      reason += rules.age_exception_min_age !== null
        ? `, máximo ${rules.age_exception_max_age} años`
        : `máximo ${rules.age_exception_max_age} años`
    }
    reason += `.`
  }

  return {
    isValid: false,
    age,
    meetsRegularRequirements: false,
    isException: false,
    reason,
  }
}

/**
 * Format age for display
 */
export function formatAge(age: number): string {
  return `${age} año${age !== 1 ? 's' : ''}`
}

/**
 * Get a human-readable description of age rules
 */
export function describeAgeRules(rules: AgeValidationRules): string {
  if (!rules.age_validation_enabled) {
    return 'Sin restricción de edad'
  }

  const parts: string[] = []

  if (rules.min_age !== null && rules.max_age !== null) {
    parts.push(`Edad: ${rules.min_age}-${rules.max_age} años`)
  } else if (rules.min_age !== null) {
    parts.push(`Mayores de ${rules.min_age} años`)
  } else if (rules.max_age !== null) {
    parts.push(`Menores de ${rules.max_age} años`)
  }

  if (rules.age_exception_count > 0) {
    let exceptionDesc = `${rules.age_exception_count} excepcion${rules.age_exception_count > 1 ? 'es' : ''}`
    if (rules.age_exception_min_age !== null) {
      exceptionDesc += ` (mín. ${rules.age_exception_min_age} años)`
    }
    parts.push(exceptionDesc)
  }

  if (rules.age_reference_date) {
    const refDate = parseDate(rules.age_reference_date)
    parts.push(`Ref: ${refDate.toLocaleDateString('es-MX')}`)
  }

  return parts.join(' | ')
}
