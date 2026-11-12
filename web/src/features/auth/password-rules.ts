/** Mirrors backend/internal/session: 10+ characters, at most 72 bytes (bcrypt). */
export function passwordProblem(p: string): string | null {
  if (Array.from(p).length < 10) return 'Mínimo 10 caracteres'
  if (new TextEncoder().encode(p).length > 72) return 'Máximo 72 caracteres'
  return null
}
