import { useAuth } from '@/lib/auth/auth-context'
import { CalendarPage } from './calendar-page'

/**
 * Wrapper that extracts leagueId from auth context and passes it to CalendarPage.
 * For league_admin, profile.league_id is set. If not available, fall back to 'public' routes.
 */
export function MatchesLayoutPage() {
  const { profile } = useAuth()

  if (!profile?.league_id) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p>No se encontró una liga asociada a tu cuenta.</p>
      </div>
    )
  }

  return <CalendarPage leagueId={profile.league_id} />
}
