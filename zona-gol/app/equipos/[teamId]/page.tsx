import { createServerSupabaseClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { TeamDetailClient } from "./team-detail-client"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface TeamDetailPageProps {
  params: Promise<{
    teamId: string
  }>
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { teamId } = await params

  if (!teamId) {
    notFound()
  }

  const supabase = await createServerSupabaseClient()

  // Cargar equipo primero
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, name, slug, description, logo, league_id, is_active')
    .eq('id', teamId)
    .single()

  if (teamError || !team) {
    notFound()
  }

  // Cargar el resto de datos en PARALELO
  const [leagueResult, playersResult, coachingStaffResult, matchesResult] = await Promise.all([
    // League logo
    team.league_id
      ? supabase
          .from('leagues')
          .select('logo, admin_id')
          .eq('id', team.league_id)
          .single()
      : Promise.resolve({ data: null }),

    // Players
    supabase
      .from('players')
      .select('id, name, team_id, position, jersey_number, photo, birth_date, is_active')
      .eq('team_id', teamId)
      .eq('is_active', true),

    // Coaching staff
    supabase
      .from('coaching_staff')
      .select('id, team_id, name, role, photo, cedula, is_active')
      .eq('team_id', teamId)
      .eq('is_active', true),

    // Team matches
    supabase
      .from('matches')
      .select('home_team_id, away_team_id, home_score, away_score, status')
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .eq('status', 'finished')
  ])

  const players = playersResult.data || []
  const playerIds = players.map(p => p.id)

  // Cargar player stats si hay jugadores
  let playerStats: any[] = []
  if (playerIds.length > 0) {
    const { data: statsData } = await supabase
      .from('player_stats')
      .select('player_id, goals, assists, yellow_cards, red_cards, minutes_played')
      .in('player_id', playerIds)

    playerStats = statsData || []
  }

  // Calcular stats por jugador
  const statsByPlayer: Record<string, any[]> = {}
  playerStats.forEach(stat => {
    if (!statsByPlayer[stat.player_id]) {
      statsByPlayer[stat.player_id] = []
    }
    statsByPlayer[stat.player_id].push(stat)
  })

  const playersWithStats = players.map(player => {
    const stats = statsByPlayer[player.id] || []
    return {
      ...player,
      total_games: stats.length,
      total_goals: stats.reduce((sum, s) => sum + (s.goals || 0), 0),
      total_assists: stats.reduce((sum, s) => sum + (s.assists || 0), 0),
      total_yellow_cards: stats.reduce((sum, s) => sum + (s.yellow_cards || 0), 0),
      total_red_cards: stats.reduce((sum, s) => sum + (s.red_cards || 0), 0),
      total_minutes_played: stats.reduce((sum, s) => sum + (s.minutes_played || 0), 0),
    }
  })

  // Calcular team record
  const teamMatches = matchesResult.data || []
  let wins = 0, losses = 0, draws = 0, goalsFor = 0, goalsAgainst = 0

  teamMatches.forEach(match => {
    if (match.home_score === null || match.away_score === null) return

    const isHome = match.home_team_id === teamId
    const teamScore = isHome ? match.home_score : match.away_score
    const opponentScore = isHome ? match.away_score : match.home_score

    goalsFor += teamScore
    goalsAgainst += opponentScore

    if (teamScore > opponentScore) wins++
    else if (teamScore < opponentScore) losses++
    else draws++
  })

  const teamRecord = {
    matchesCount: teamMatches.length,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    points: (wins * 3) + draws
  }

  return (
    <TeamDetailClient
      initialData={{
        team,
        playersWithStats,
        coachingStaff: coachingStaffResult.data || [],
        leagueLogo: leagueResult.data?.logo || '',
        leagueAdminId: leagueResult.data?.admin_id || null,
        teamRecord,
      }}
    />
  )
}
