import { describe, expect, it } from 'vitest'

import { ageOn, checkAge } from './age'

const rules = { age_validation_enabled: true, min_age: 18, max_age: 30, age_reference_date: '2025-01-01' }

describe('age rules', () => {
  it('counts full years at the reference date', () => {
    expect(ageOn('2000-01-02', new Date(2025, 0, 1))).toBe(24)
    expect(ageOn('2000-01-01', new Date(2025, 0, 1))).toBe(25)
  })

  it('judges against min/max using the tournament reference date', () => {
    expect(checkAge('2000-06-15', rules)).toEqual({ age: 24, ok: true })
    expect(checkAge('2010-06-15', rules)).toEqual({ age: 14, ok: false })
    expect(checkAge('1990-01-01', rules)).toEqual({ age: 35, ok: false })
  })

  it('gives the age without a verdict when the tournament has no age validation', () => {
    expect(checkAge('2000-06-15', { ...rules, age_validation_enabled: false })).toEqual({ age: 24, ok: null })
    expect(checkAge('2000-06-15', undefined)?.ok).toBeNull()
  })

  it('returns null without a birth date', () => {
    expect(checkAge(undefined, rules)).toBeNull()
  })
})
