/**
 * Money helpers. Amounts travel as decimal strings ("1500.50"); we never use
 * floats for arithmetic, only integer cents.
 */

const MAX_CENTS = 99_999_999 // 999999.99

/** Display formatting of a decimal string (rounded to cents; never used for arithmetic). */
export function formatMoney(value: string | undefined): string {
  const cents = toCents(normalize(value ?? '0')) ?? 0
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100)
}

/** "1500.5" -> 150050; null when the string is not a plain decimal with up to 2 decimals. */
export function toCents(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim())
  if (!match) return null
  const whole = Number(match[1])
  const frac = Number((match[2] ?? '').padEnd(2, '0'))
  return whole * 100 + frac
}

/** 150050 -> "1500.50" */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/** Remaining amount of a charge ("amount" - "amount_paid") as a decimal string. */
export function remainingAmount(amount: string, amountPaid: string): string {
  const total = toCents(normalize(amount))
  const paid = toCents(normalize(amountPaid))
  if (total === null || paid === null) return ''
  return fromCents(Math.max(total - paid, 0))
}

/** The API may return more decimals ("100.0000"); trim to cents for arithmetic. */
function normalize(value: string): string {
  const [whole = '0', frac = ''] = value.split('.')
  return frac ? `${whole}.${frac.slice(0, 2)}` : whole
}

export type AmountResult = { ok: true; value: string } | { ok: false; error: string }

/** Client-side mirror of the backend rule: > 0, at most 2 decimals, <= 999999.99. */
export function validateAmount(input: string): AmountResult {
  const text = input.trim()
  if (!text) return { ok: false, error: 'Ingresa un monto' }
  if (!/^\d+(\.\d*)?$/.test(text)) return { ok: false, error: 'Ingresa un monto válido' }
  if (/\.\d{3,}/.test(text)) return { ok: false, error: 'Máximo 2 decimales' }
  const cents = toCents(text.endsWith('.') ? text.slice(0, -1) : text)
  if (cents === null) return { ok: false, error: 'Ingresa un monto válido' }
  if (cents <= 0) return { ok: false, error: 'Debe ser mayor a 0' }
  if (cents > MAX_CENTS) return { ok: false, error: 'No puede exceder 999999.99' }
  return { ok: true, value: fromCents(cents) }
}
