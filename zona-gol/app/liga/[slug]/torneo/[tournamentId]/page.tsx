import { PublicLeagueView } from "@/components/public/public-league-view"
import { serverLeagueActions } from "@/lib/actions/league-actions"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

interface TournamentPageProps {
  params: Promise<{
    slug: string
    tournamentId: string
  }>
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  try {
    const { slug, tournamentId } = await params

    // Obtener la liga por slug
    const league = await serverLeagueActions.getLeagueBySlug(slug)

    // Obtener el torneo específico
    const supabase = await createServerSupabaseClient()
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .eq('league_id', league.id)
      .single()

    if (tournamentError || !tournament) {
      console.error('Error loading tournament:', tournamentError)
      notFound()
    }

    return <PublicLeagueView league={league} tournamentId={tournamentId} />
  } catch (error) {
    console.error('Error loading tournament page:', error)
    notFound()
  }
}
