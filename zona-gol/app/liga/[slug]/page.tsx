import { LeagueTournamentsView } from "@/components/public/league-tournaments-view"
import { serverLeagueActions } from "@/lib/actions/league-actions"
import { notFound } from "next/navigation"

// Force dynamic rendering - no static generation during build
export const dynamic = 'force-dynamic'

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
