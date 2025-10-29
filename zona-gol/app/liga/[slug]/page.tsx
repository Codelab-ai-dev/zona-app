import { LeagueTournamentsView } from "@/components/public/league-tournaments-view"
import { serverLeagueActions } from "@/lib/actions/league-actions"
import { notFound } from "next/navigation"

interface PublicLeaguePageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function PublicLeaguePage({ params }: PublicLeaguePageProps) {
  try {
    const { slug } = await params
    const league = await serverLeagueActions.getLeagueBySlug(slug)
    return <LeagueTournamentsView league={league} />
  } catch (error) {
    console.error('Error loading league:', error)
    notFound()
  }
}

export async function generateStaticParams() {
  try {
    const leagues = await serverLeagueActions.getActiveLeagues()
    return leagues.map((league) => ({
      slug: league.slug,
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}
