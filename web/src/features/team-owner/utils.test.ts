import { describe, expect, it } from 'vitest'

import { formatDate, toApiDate, toDateInput } from './utils'

describe('date helpers (Go decodes dates into time.Time, which needs RFC 3339)', () => {
  it('converts the <input type="date"> value to RFC 3339', () => {
    expect(toApiDate('2000-05-15')).toBe('2000-05-15T00:00:00Z')
  })

  it('sends nothing for an empty date', () => {
    expect(toApiDate('')).toBeUndefined()
    expect(toApiDate(undefined)).toBeUndefined()
  })

  it('converts an API timestamp back to an <input type="date"> value', () => {
    expect(toDateInput('2000-05-15T00:00:00Z')).toBe('2000-05-15')
    expect(toDateInput(undefined)).toBe('')
  })

  it('formats calendar dates without shifting the day', () => {
    expect(formatDate('2000-05-15T00:00:00Z')).toBe('15 de mayo de 2000')
  })
})
