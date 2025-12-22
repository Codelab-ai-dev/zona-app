import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { serverLeagueActions } from "@/lib/actions/league-actions"
import { LeagueDirectory } from "@/components/public/league-directory"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Check auth on server
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Redirect authenticated users to dashboard
  if (session) {
    redirect("/dashboard")
  }

  // Fetch leagues on server
  const leagues = await serverLeagueActions.getActiveLeagues()

  // Fetch stats for all leagues in parallel
  const statsPromises = leagues.map(async (league) => {
    const stats = await serverLeagueActions.getLeagueStats(league.id)
    return {
      leagueId: league.id,
      stats: {
        teamsCount: stats.teamsCount || 0,
        tournamentsCount: stats.tournamentsCount || 0,
        activeTournament: stats.activeTournament || null,
      }
    }
  })

  const statsResults = await Promise.all(statsPromises)
  const leagueStats: Record<string, any> = {}
  statsResults.forEach(({ leagueId, stats }) => {
    leagueStats[leagueId] = stats
  })

  return (
    <LeagueDirectory
      initialData={{
        leagues,
        leagueStats,
      }}
    />
  )
}
