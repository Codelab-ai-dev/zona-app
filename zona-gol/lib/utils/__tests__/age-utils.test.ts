import { describe, it, expect } from 'vitest'
import {
  calculateAge,
  parseDate,
  validatePlayerAge,
  formatAge,
  describeAgeRules,
  type AgeValidationRules,
} from '../age-utils'

describe('age-utils', () => {
  describe('calculateAge', () => {
    it('calculates age correctly when birthday has passed', () => {
      const birthDate = new Date(2000, 0, 15) // Jan 15, 2000
      const referenceDate = new Date(2024, 6, 20) // Jul 20, 2024

      expect(calculateAge(birthDate, referenceDate)).toBe(24)
    })

    it('calculates age correctly when birthday has not passed yet', () => {
      const birthDate = new Date(2000, 6, 20) // Jul 20, 2000
      const referenceDate = new Date(2024, 0, 15) // Jan 15, 2024

      expect(calculateAge(birthDate, referenceDate)).toBe(23)
    })

    it('returns 0 for same dates', () => {
      const birthDate = new Date(2024, 0, 15)
      const referenceDate = new Date(2024, 0, 15)

      expect(calculateAge(birthDate, referenceDate)).toBe(0)
    })

    it('calculates age correctly on exact birthday', () => {
      const birthDate = new Date(2000, 5, 15) // Jun 15, 2000
      const referenceDate = new Date(2024, 5, 15) // Jun 15, 2024

      expect(calculateAge(birthDate, referenceDate)).toBe(24)
    })

    it('calculates age correctly one day before birthday', () => {
      const birthDate = new Date(2000, 5, 15) // Jun 15, 2000
      const referenceDate = new Date(2024, 5, 14) // Jun 14, 2024

      expect(calculateAge(birthDate, referenceDate)).toBe(23)
    })

    it('handles leap year births correctly', () => {
      const birthDate = new Date(2000, 1, 29) // Feb 29, 2000 (leap year)
      const referenceDate = new Date(2024, 1, 28) // Feb 28, 2024

      expect(calculateAge(birthDate, referenceDate)).toBe(23)
    })

    it('handles leap year births on leap day', () => {
      const birthDate = new Date(2000, 1, 29) // Feb 29, 2000
      const referenceDate = new Date(2024, 1, 29) // Feb 29, 2024

      expect(calculateAge(birthDate, referenceDate)).toBe(24)
    })
  })

  describe('parseDate', () => {
    it('parses date string correctly', () => {
      const date = parseDate('2000-01-15')

      expect(date.getFullYear()).toBe(2000)
      expect(date.getMonth()).toBe(0) // January (0-indexed)
      expect(date.getDate()).toBe(15)
    })

    it('parses different date formats correctly', () => {
      const date = parseDate('2024-12-31')

      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(11) // December (0-indexed)
      expect(date.getDate()).toBe(31)
    })

    it('handles single-digit months and days', () => {
      const date = parseDate('2024-03-05')

      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(2) // March (0-indexed)
      expect(date.getDate()).toBe(5)
    })
  })

  describe('validatePlayerAge', () => {
    const baseRules: AgeValidationRules = {
      age_validation_enabled: true,
      min_age: 18,
      max_age: 35,
      age_reference_date: '2024-01-01',
      age_exception_count: 2,
      age_exception_min_age: 16,
      age_exception_max_age: 40,
    }

    describe('when validation is disabled', () => {
      it('always returns valid with correct age', () => {
        const rules: AgeValidationRules = {
          ...baseRules,
          age_validation_enabled: false,
        }

        const result = validatePlayerAge('2010-01-01', rules) // 14 years old

        expect(result.isValid).toBe(true)
        expect(result.age).toBe(14)
        expect(result.meetsRegularRequirements).toBe(true)
        expect(result.isException).toBe(false)
        expect(result.reason).toBeUndefined()
      })
    })

    describe('when validation is enabled', () => {
      describe('regular requirements', () => {
        it('validates player within age range', () => {
          const result = validatePlayerAge('2000-01-01', baseRules) // 24 years old

          expect(result.isValid).toBe(true)
          expect(result.age).toBe(24)
          expect(result.meetsRegularRequirements).toBe(true)
          expect(result.isException).toBe(false)
        })

        it('validates player at minimum age', () => {
          const result = validatePlayerAge('2006-01-01', baseRules) // 18 years old

          expect(result.isValid).toBe(true)
          expect(result.age).toBe(18)
          expect(result.meetsRegularRequirements).toBe(true)
          expect(result.isException).toBe(false)
        })

        it('validates player at maximum age', () => {
          const result = validatePlayerAge('1989-01-01', baseRules) // 35 years old

          expect(result.isValid).toBe(true)
          expect(result.age).toBe(35)
          expect(result.meetsRegularRequirements).toBe(true)
          expect(result.isException).toBe(false)
        })

        it('rejects player below minimum age when no exceptions available', () => {
          const result = validatePlayerAge('2010-01-01', baseRules, 2) // 14 years old, 2 exceptions used

          expect(result.isValid).toBe(false)
          expect(result.age).toBe(14)
          expect(result.meetsRegularRequirements).toBe(false)
          expect(result.isException).toBe(false)
          expect(result.reason).toContain('No hay excepciones disponibles')
        })

        it('rejects player above maximum age when no exceptions available', () => {
          const result = validatePlayerAge('1980-01-01', baseRules, 2) // 44 years old, 2 exceptions used

          expect(result.isValid).toBe(false)
          expect(result.age).toBe(44)
          expect(result.meetsRegularRequirements).toBe(false)
          expect(result.isException).toBe(false)
          expect(result.reason).toContain('No hay excepciones disponibles')
        })
      })

      describe('exception handling', () => {
        it('accepts player as exception when they qualify', () => {
          const result = validatePlayerAge('2007-01-01', baseRules) // 17 years old, qualifies for exception (16-40)

          expect(result.isValid).toBe(true)
          expect(result.age).toBe(17)
          expect(result.meetsRegularRequirements).toBe(false)
          expect(result.isException).toBe(true)
          expect(result.reason).toContain('excepción')
          expect(result.reason).toContain('1 excepciones restantes')
        })

        it('tracks used exceptions correctly', () => {
          const result = validatePlayerAge('2007-01-01', baseRules, 1) // 17 years old, 1 exception already used

          expect(result.isValid).toBe(true)
          expect(result.isException).toBe(true)
          expect(result.reason).toContain('0 excepciones restantes')
        })

        it('accepts older player as exception', () => {
          const result = validatePlayerAge('1986-01-01', baseRules) // 38 years old, qualifies for exception (16-40)

          expect(result.isValid).toBe(true)
          expect(result.age).toBe(38)
          expect(result.meetsRegularRequirements).toBe(false)
          expect(result.isException).toBe(true)
        })

        it('rejects player outside exception range', () => {
          const result = validatePlayerAge('2010-01-01', baseRules) // 14 years old, below exception min (16)

          expect(result.isValid).toBe(false)
          expect(result.age).toBe(14)
          expect(result.isException).toBe(false)
          expect(result.reason).toContain('Se requiere mínimo 18 años')
          expect(result.reason).toContain('mínimo 16 años')
        })

        it('rejects player above exception maximum age', () => {
          const result = validatePlayerAge('1982-01-01', baseRules) // 42 years old, above exception max (40)

          expect(result.isValid).toBe(false)
          expect(result.age).toBe(42)
          expect(result.isException).toBe(false)
          expect(result.reason).toContain('Se permite máximo 35 años')
        })
      })

      describe('edge cases with null values', () => {
        it('validates when only min_age is set', () => {
          const rules: AgeValidationRules = {
            ...baseRules,
            max_age: null,
            age_exception_max_age: null,
          }

          const result = validatePlayerAge('1980-01-01', rules) // 44 years old

          expect(result.isValid).toBe(true)
          expect(result.age).toBe(44)
          expect(result.meetsRegularRequirements).toBe(true)
        })

        it('validates when only max_age is set', () => {
          const rules: AgeValidationRules = {
            ...baseRules,
            min_age: null,
            age_exception_min_age: null,
          }

          const result = validatePlayerAge('2015-01-01', rules) // 9 years old

          expect(result.isValid).toBe(true)
          expect(result.age).toBe(9)
          expect(result.meetsRegularRequirements).toBe(true)
        })

        it('validates when no age limits are set', () => {
          const rules: AgeValidationRules = {
            ...baseRules,
            min_age: null,
            max_age: null,
            age_exception_min_age: null,
            age_exception_max_age: null,
          }

          const result = validatePlayerAge('2000-01-01', rules)

          expect(result.isValid).toBe(true)
          expect(result.meetsRegularRequirements).toBe(true)
        })

        it('handles null exception ages', () => {
          const rules: AgeValidationRules = {
            ...baseRules,
            age_exception_min_age: null,
            age_exception_max_age: null,
          }

          const result = validatePlayerAge('2010-01-01', rules) // 14 years old

          expect(result.isValid).toBe(true) // Qualifies as exception (no limits)
          expect(result.isException).toBe(true)
        })
      })

      describe('reference date handling', () => {
        it('uses current date when age_reference_date is null', () => {
          const rules: AgeValidationRules = {
            ...baseRules,
            age_reference_date: null,
          }

          const currentYear = new Date().getFullYear()
          const birthYear = currentYear - 20
          const result = validatePlayerAge(`${birthYear}-01-01`, rules)

          expect(result.age).toBeGreaterThanOrEqual(19)
          expect(result.age).toBeLessThanOrEqual(20)
        })

        it('calculates age based on reference date', () => {
          const rules: AgeValidationRules = {
            ...baseRules,
            age_reference_date: '2025-12-31',
          }

          const result = validatePlayerAge('2000-01-01', rules) // 25 years old on 2025-12-31

          expect(result.age).toBe(25)
        })
      })

      describe('error messages', () => {
        it('provides simple message when no exceptions available', () => {
          const result = validatePlayerAge('2010-01-01', baseRules, 2) // 14 years old, all exceptions used

          expect(result.isValid).toBe(false)
          expect(result.reason).toContain('No hay excepciones disponibles')
          expect(result.reason).toContain('El jugador tiene 14 años')
        })

        it('provides detailed reason when too young and exceptions available', () => {
          const result = validatePlayerAge('2010-01-01', baseRules) // 14 years old, below exception min (16)

          expect(result.reason).toContain('El jugador tiene 14 años')
          expect(result.reason).toContain('Se requiere mínimo 18 años')
        })

        it('provides detailed reason when too old and exceptions available', () => {
          const result = validatePlayerAge('1982-01-01', baseRules) // 42 years old, above exception max (40)

          expect(result.reason).toContain('El jugador tiene 42 años')
          expect(result.reason).toContain('Se permite máximo 35 años')
        })

        it('includes exception info in error message', () => {
          const result = validatePlayerAge('2010-01-01', baseRules) // 14 years old, exceptions available

          expect(result.reason).toContain('Excepciones permitidas')
          expect(result.reason).toContain('mínimo 16 años')
          expect(result.reason).toContain('máximo 40 años')
        })

        it('formats exception message correctly with only min age', () => {
          const rules: AgeValidationRules = {
            ...baseRules,
            age_exception_min_age: 16,
            age_exception_max_age: null,
          }

          const result = validatePlayerAge('2010-01-01', rules) // 14 years old, below exception min

          expect(result.reason).toContain('mínimo 16 años')
        })

        it('formats exception message correctly with only max age', () => {
          const rules: AgeValidationRules = {
            ...baseRules,
            age_exception_min_age: null,
            age_exception_max_age: 40,
          }

          const result = validatePlayerAge('1982-01-01', rules) // 42 years old, above exception max

          expect(result.reason).toContain('Excepciones permitidas')
          expect(result.reason).toContain('máximo 40 años')
        })
      })
    })
  })

  describe('formatAge', () => {
    it('formats singular age correctly', () => {
      expect(formatAge(1)).toBe('1 año')
    })

    it('formats plural age correctly', () => {
      expect(formatAge(2)).toBe('2 años')
      expect(formatAge(18)).toBe('18 años')
      expect(formatAge(35)).toBe('35 años')
    })

    it('formats zero age correctly', () => {
      expect(formatAge(0)).toBe('0 años')
    })
  })

  describe('describeAgeRules', () => {
    it('returns correct message when validation is disabled', () => {
      const rules: AgeValidationRules = {
        age_validation_enabled: false,
        min_age: null,
        max_age: null,
        age_reference_date: null,
        age_exception_count: 0,
        age_exception_min_age: null,
        age_exception_max_age: null,
      }

      expect(describeAgeRules(rules)).toBe('Sin restricción de edad')
    })

    it('describes min and max age range', () => {
      const rules: AgeValidationRules = {
        age_validation_enabled: true,
        min_age: 18,
        max_age: 35,
        age_reference_date: null,
        age_exception_count: 0,
        age_exception_min_age: null,
        age_exception_max_age: null,
      }

      expect(describeAgeRules(rules)).toBe('Edad: 18-35 años')
    })

    it('describes only minimum age', () => {
      const rules: AgeValidationRules = {
        age_validation_enabled: true,
        min_age: 18,
        max_age: null,
        age_reference_date: null,
        age_exception_count: 0,
        age_exception_min_age: null,
        age_exception_max_age: null,
      }

      expect(describeAgeRules(rules)).toBe('Mayores de 18 años')
    })

    it('describes only maximum age', () => {
      const rules: AgeValidationRules = {
        age_validation_enabled: true,
        min_age: null,
        max_age: 35,
        age_reference_date: null,
        age_exception_count: 0,
        age_exception_min_age: null,
        age_exception_max_age: null,
      }

      expect(describeAgeRules(rules)).toBe('Menores de 35 años')
    })

    it('includes single exception in description', () => {
      const rules: AgeValidationRules = {
        age_validation_enabled: true,
        min_age: 18,
        max_age: 35,
        age_reference_date: null,
        age_exception_count: 1,
        age_exception_min_age: null,
        age_exception_max_age: null,
      }

      expect(describeAgeRules(rules)).toBe('Edad: 18-35 años | 1 excepcion')
    })

    it('includes multiple exceptions in description', () => {
      const rules: AgeValidationRules = {
        age_validation_enabled: true,
        min_age: 18,
        max_age: 35,
        age_reference_date: null,
        age_exception_count: 3,
        age_exception_min_age: null,
        age_exception_max_age: null,
      }

      expect(describeAgeRules(rules)).toBe('Edad: 18-35 años | 3 excepciones')
    })

    it('includes exception minimum age', () => {
      const rules: AgeValidationRules = {
        age_validation_enabled: true,
        min_age: 18,
        max_age: 35,
        age_reference_date: null,
        age_exception_count: 2,
        age_exception_min_age: 16,
        age_exception_max_age: null,
      }

      expect(describeAgeRules(rules)).toBe('Edad: 18-35 años | 2 excepciones (mín. 16 años)')
    })

    it('includes reference date', () => {
      const rules: AgeValidationRules = {
        age_validation_enabled: true,
        min_age: 18,
        max_age: 35,
        age_reference_date: '2024-01-15',
        age_exception_count: 0,
        age_exception_min_age: null,
        age_exception_max_age: null,
      }

      const result = describeAgeRules(rules)
      expect(result).toContain('Edad: 18-35 años')
      expect(result).toContain('Ref:')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })

    it('combines all elements correctly', () => {
      const rules: AgeValidationRules = {
        age_validation_enabled: true,
        min_age: 18,
        max_age: 35,
        age_reference_date: '2024-01-01',
        age_exception_count: 2,
        age_exception_min_age: 16,
        age_exception_max_age: null,
      }

      const result = describeAgeRules(rules)
      expect(result).toContain('Edad: 18-35 años')
      expect(result).toContain('2 excepciones (mín. 16 años)')
      expect(result).toContain('Ref:')
    })

    it('handles only exceptions without age limits', () => {
      const rules: AgeValidationRules = {
        age_validation_enabled: true,
        min_age: null,
        max_age: null,
        age_reference_date: null,
        age_exception_count: 2,
        age_exception_min_age: 16,
        age_exception_max_age: null,
      }

      expect(describeAgeRules(rules)).toBe('2 excepciones (mín. 16 años)')
    })
  })
})
