import { describe, expect, it } from 'vitest'

import { formatMoney, fromCents, remainingAmount, toCents, validateAmount } from './money'

describe('money', () => {
  it('accepts positive amounts with up to 2 decimals and returns a decimal string', () => {
    expect(validateAmount('1500')).toEqual({ ok: true, value: '1500.00' })
    expect(validateAmount('0.5')).toEqual({ ok: true, value: '0.50' })
    expect(validateAmount(' 10.25 ')).toEqual({ ok: true, value: '10.25' })
  })

  it.each([
    ['', 'Ingresa un monto'],
    ['abc', 'Ingresa un monto válido'],
    ['-5', 'Ingresa un monto válido'],
    ['0', 'Debe ser mayor a 0'],
    ['0.00', 'Debe ser mayor a 0'],
    ['10.123', 'Máximo 2 decimales'],
    ['1000000', 'No puede exceder 999999.99'],
  ])('rejects %j', (input, error) => {
    expect(validateAmount(input)).toEqual({ ok: false, error })
  })

  it('does arithmetic in integer cents, free of float drift', () => {
    expect(toCents('0.10')).toBe(10)
    expect(remainingAmount('0.30', '0.10')).toBe('0.20')
    expect(remainingAmount('1500.5000', '500.00')).toBe('1000.50')
    expect(remainingAmount('10.00', '50.00')).toBe('0.00')
    expect(fromCents(5)).toBe('0.05')
  })

  it('formats MXN currency', () => {
    expect(formatMoney('1500.5')).toMatch(/1,500\.50/)
    expect(formatMoney(undefined)).toMatch(/0\.00/)
  })
})

describe('money: config amounts and totals', () => {
  it('accepts zero (and numbers from the API) for config amounts', async () => {
    const { validateNonNegativeAmount } = await import('./money')
    expect(validateNonNegativeAmount('0')).toEqual({ ok: true, value: '0.00' })
    expect(validateNonNegativeAmount(0)).toEqual({ ok: true, value: '0.00' })
    expect(validateNonNegativeAmount('0.00')).toEqual({ ok: true, value: '0.00' })
    expect(validateNonNegativeAmount(50)).toEqual({ ok: true, value: '50.00' })
    expect(validateNonNegativeAmount('12.345')).toEqual({ ok: false, error: 'Máximo 2 decimales' })
    expect(validateNonNegativeAmount('-1')).toEqual({ ok: false, error: 'Ingresa un monto válido' })
    expect(validateNonNegativeAmount('')).toEqual({ ok: false, error: 'Ingresa un monto' })
  })

  it('sums in cents and formats in the league currency', async () => {
    const { sumAmounts, absAmount } = await import('./money')
    expect(sumAmounts(['0.10', '0.20', 300.5])).toBe('300.80')
    expect(sumAmounts(['-5.00', '2.50'])).toBe('-2.50')
    expect(absAmount('-12.50')).toBe('12.50')
    expect(formatMoney('1500.5', 'USD')).toMatch(/1,500\.50/)
    expect(formatMoney('10', 'MXN')).toBe('$10.00')
  })
})
