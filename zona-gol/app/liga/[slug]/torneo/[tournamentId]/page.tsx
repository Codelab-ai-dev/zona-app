import { PublicLeagueView } from "@/components/public/public-league-view"
import { serverLeagueActions } from "@/lib/actions/league-actions"
import { notFound } from "next/navigation"

// Force dynamic rendering - no static generation during build
export const dynamic = 'force-dynamic'

interface TournamentPageProps {
  params: Promise<{
    slug: string
    tournamentId: string
  }>
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  try {
    const { slug, tournamentId } = await params

    // Primero obtener la liga (necesaria para las demás queries)
    const league = await serverLeagueActions.getLeagueBySlug(slug)

    if (!league) {
      notFound()
    }

    // Cargar el resto de datos en PARALELO
    const [tournaments, teams, stats] = await Promise.all([
      serverLeagueActions.getTournamentsByLeague(league.id),
      serverLeagueActions.getTeamsByTournament(tournamentId),
      serverLeagueActions.getTournamentStats(tournamentId),
    ])

    // Verificar que el torneo existe en los resultados
    const tournamentExists = tournaments?.some(t => t.id === tournamentId)
    if (!tournamentExists) {
      console.error('Tournament not found in league')
      notFound()
    }

    // Pasar datos pre-cargados al componente
    return (
      <PublicLeagueView
        league={league}
        tournamentId={tournamentId}
        initialData={{
          tournaments: tournaments || [],
          teams: teams || [],
          stats,
        }}
      />
    )
  } catch (error) {
    console.error('Error loading tournament page:', error)
    notFound()
  }
}
