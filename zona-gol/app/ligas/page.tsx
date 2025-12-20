import { LeagueDirectory } from "@/components/public/league-directory"

// Force dynamic rendering - no static generation during build
export const dynamic = 'force-dynamic'

export default function LigasPage() {
  return <LeagueDirectory />
}