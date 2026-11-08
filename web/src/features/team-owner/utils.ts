import { toast } from 'sonner'

import { ApiError } from '@/lib/api/client'

/**
 * Mutation error feedback. Validation errors (422) are shown next to the form
 * fields by the form itself, so they do not toast; everything else toasts the
 * API message (or the fallback for non-API errors).
 */
export function notifyMutationError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.isValidation && Object.keys(error.fields).length > 0) return
    toast.error(error.message)
    return
  }
  toast.error(fallback)
}

/** The Go API decodes dates into time.Time, which needs RFC 3339. */
export function toApiDate(date: string | undefined): string | undefined {
  return date ? `${date}T00:00:00Z` : undefined
}

/** RFC 3339 -> value for <input type="date">. */
export function toDateInput(iso: string | undefined): string {
  return iso ? iso.slice(0, 10) : ''
}

/** "15 de mayo de 2000". Dates are calendar dates, so UTC avoids day shifts. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** "Luis García" -> "LG". */
export function initials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
