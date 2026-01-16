import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface DuplicateMatch {
  pair: string
  matches: Array<{
    id: string
    round: number
    date: string
    homeTeam: string
    awayTeam: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId')

    if (!tournamentId) {
      return NextResponse.json(
        { success: false, error: 'tournamentId es requerido' },
        { status: 400 }
      )
    }

    // Get all matches for the tournament with team names
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        id,
        round,
        match_date,
        home_team_id,
        away_team_id,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })

    if (error) {
      console.error('Error fetching matches:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Find duplicates (same pair playing more than once)
    const pairMap = new Map<string, Array<{
      id: string
      round: number
      date: string
      homeTeam: string
      awayTeam: string
    }>>()

    for (const match of matches || []) {
      // Create normalized pair key (sorted team IDs)
      const pairKey = [match.home_team_id, match.away_team_id].sort().join('|')

      const homeTeamName = (match.home_team as any)?.name || match.home_team_id
      const awayTeamName = (match.away_team as any)?.name || match.away_team_id

      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, [])
      }

      pairMap.get(pairKey)!.push({
        id: match.id,
        round: match.round || 0,
        date: match.match_date || '',
        homeTeam: homeTeamName,
        awayTeam: awayTeamName
      })
    }

    // Filter to only pairs with duplicates
    const duplicates: DuplicateMatch[] = []
    for (const [pairKey, matchList] of pairMap.entries()) {
      if (matchList.length > 1) {
        duplicates.push({
          pair: `${matchList[0].homeTeam} vs ${matchList[0].awayTeam}`,
          matches: matchList.sort((a, b) => a.round - b.round)
        })
      }
    }

    return NextResponse.json({
      success: true,
      totalMatches: matches?.length || 0,
      duplicatesFound: duplicates.length,
      duplicates
    })

  } catch (error) {
    console.error('Error finding duplicates:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    )
  }
}
