import { describe, it, expect } from 'vitest'
import {
  analyzeTeamActivity,
  generateRoundRobinSchedule,
  getNextMatchDate,
  getByeTeamMessage,
  type TeamMatchStats,
} from '../calendar-adjuster'
import type { Database } from '@/lib/supabase/database.types'

type Team = Database['public']['Tables']['teams']['Row']
type Match = Database['public']['Tables']['matches']['Row']

// Helper to create mock teams
const createMockTeam = (id: string, name: string, isActive = true): Team => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  is_active: isActive,
  league_id: 'league-1',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  logo_url: null,
  owner_user_id: null,
  season_id: null,
})

// Helper to create mock matches
const createMockMatch = (
  id: string,
  homeTeamId: string,
  awayTeamId: string,
  status: 'scheduled' | 'finished' = 'scheduled',
  matchDate = '2024-01-15'
): Match => ({
  id,
  tournament_id: 'tournament-1',
  home_team_id: homeTeamId,
  away_team_id: awayTeamId,
  match_date: matchDate,
  match_time: '18:00',
  location: 'Field 1',
  status,
  home_team_score: null,
  away_team_score: null,
  round: 1,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  notes: null,
  referee: null,
})

describe('calendar-adjuster', () => {
  describe('analyzeTeamActivity', () => {
    it('identifies all teams as active when all have matches', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
      ]

      const matches = [
        createMockMatch('match-1', 'team-1', 'team-2', 'finished'),
      ]

      const result = analyzeTeamActivity(teams, matches)

      expect(result.activeTeams).toHaveLength(2)
      expect(result.inactiveTeams).toHaveLength(0)
      expect(result.suggestedAction).toBe('keep_current')
      expect(result.hasOddTeams).toBe(false)
    })

    it('identifies inactive teams when not approved', () => {
      const teams = [
        createMockTeam('team-1', 'Team A', true),
        createMockTeam('team-2', 'Team B', false),
      ]

      const matches = [
        createMockMatch('match-1', 'team-1', 'team-2'),
      ]

      const result = analyzeTeamActivity(teams, matches)

      expect(result.activeTeams).toHaveLength(1)
      expect(result.inactiveTeams).toHaveLength(1)
      expect(result.suggestedAction).toBe('regenerate')
      expect(result.teamStats[1].inactivityReason).toBe('Equipo no aprobado o desactivado')
    })

    it('identifies inactive teams when they have no matches', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
        createMockTeam('team-3', 'Team C'),
      ]

      const matches = [
        createMockMatch('match-1', 'team-1', 'team-2'),
      ]

      const result = analyzeTeamActivity(teams, matches)

      expect(result.activeTeams).toHaveLength(2)
      expect(result.inactiveTeams).toHaveLength(1)
      expect(result.teamStats[2].inactivityReason).toBe('Sin partidos asignados')
    })

    it('detects odd number of active teams', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
        createMockTeam('team-3', 'Team C'),
      ]

      const matches = [
        createMockMatch('match-1', 'team-1', 'team-2'),
        createMockMatch('match-2', 'team-2', 'team-3'),
      ]

      const result = analyzeTeamActivity(teams, matches)

      expect(result.hasOddTeams).toBe(true)
      expect(result.activeTeams).toHaveLength(3)
      expect(result.message).toContain('número impar')
    })

    it('calculates team statistics correctly', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
      ]

      const matches = [
        createMockMatch('match-1', 'team-1', 'team-2', 'finished', '2024-01-10'),
        createMockMatch('match-2', 'team-2', 'team-1', 'finished', '2024-01-15'),
        createMockMatch('match-3', 'team-1', 'team-2', 'scheduled', '2024-01-20'),
      ]

      const result = analyzeTeamActivity(teams, matches)

      const team1Stats = result.teamStats.find(s => s.teamId === 'team-1')!
      expect(team1Stats.totalMatches).toBe(3)
      expect(team1Stats.finishedMatches).toBe(2)
      expect(team1Stats.scheduledMatches).toBe(1)
      expect(team1Stats.lastMatchDate).toBe('2024-01-15')
    })

    it('suggests regenerate when inactive teams present', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
        createMockTeam('team-3', 'Team C', false),
      ]

      const matches = [
        createMockMatch('match-1', 'team-1', 'team-2'),
      ]

      const result = analyzeTeamActivity(teams, matches)

      expect(result.suggestedAction).toBe('regenerate')
      expect(result.message).toContain('Se detectaron 1 equipo(s) inactivo(s)')
      expect(result.message).toContain('regenerar el calendario')
    })

    it('suggests warning when only odd teams', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
        createMockTeam('team-3', 'Team C'),
      ]

      const matches = [
        createMockMatch('match-1', 'team-1', 'team-2'),
        createMockMatch('match-2', 'team-2', 'team-3'),
        createMockMatch('match-3', 'team-3', 'team-1'),
      ]

      const result = analyzeTeamActivity(teams, matches)

      expect(result.suggestedAction).toBe('warning')
      expect(result.message).toContain('número impar')
      expect(result.message).toContain('descansará por jornada')
    })

    it('handles teams with only scheduled matches', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
      ]

      const matches = [
        createMockMatch('match-1', 'team-1', 'team-2', 'scheduled'),
      ]

      const result = analyzeTeamActivity(teams, matches)

      expect(result.activeTeams).toHaveLength(2)
      const team1Stats = result.teamStats[0]
      expect(team1Stats.finishedMatches).toBe(0)
      expect(team1Stats.scheduledMatches).toBe(1)
      expect(team1Stats.lastMatchDate).toBeNull()
    })
  })

  describe('generateRoundRobinSchedule', () => {
    it('generates correct schedule for 2 teams', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
      ]

      const schedule = generateRoundRobinSchedule(teams)

      expect(schedule).toHaveLength(1)
      expect(schedule[0].round).toBe(1)
      expect(schedule[0].matches).toHaveLength(1)
      expect(schedule[0].matches[0].home.id).toBe('team-1')
      expect(schedule[0].matches[0].away.id).toBe('team-2')
    })

    it('generates correct schedule for 4 teams (even)', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
        createMockTeam('team-3', 'Team C'),
        createMockTeam('team-4', 'Team D'),
      ]

      const schedule = generateRoundRobinSchedule(teams)

      expect(schedule).toHaveLength(3) // 4 teams = 3 rounds
      expect(schedule[0].matches).toHaveLength(2) // 2 matches per round
    })

    it('generates correct schedule for 3 teams (odd)', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
        createMockTeam('team-3', 'Team C'),
      ]

      const schedule = generateRoundRobinSchedule(teams)

      expect(schedule).toHaveLength(3)
      // Each round should have 1 match (one team rests)
      schedule.forEach(round => {
        expect(round.matches).toHaveLength(1)
        expect(round.matches[0].byeTeam).toBeDefined()
      })
    })

    it('generates correct schedule for 5 teams (odd)', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
        createMockTeam('team-3', 'Team C'),
        createMockTeam('team-4', 'Team D'),
        createMockTeam('team-5', 'Team E'),
      ]

      const schedule = generateRoundRobinSchedule(teams)

      expect(schedule).toHaveLength(5) // 5 teams = 5 rounds
      // Each round should have 2 matches (one team rests)
      schedule.forEach(round => {
        expect(round.matches).toHaveLength(2)
      })
    })

    it('ensures each team plays all others exactly once', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
        createMockTeam('team-3', 'Team C'),
        createMockTeam('team-4', 'Team D'),
      ]

      const schedule = generateRoundRobinSchedule(teams)

      const matchups = new Set<string>()
      schedule.forEach(round => {
        round.matches.forEach(match => {
          const key = [match.home.id, match.away.id].sort().join('-')
          matchups.add(key)
        })
      })

      // For 4 teams: C(4,2) = 6 unique matchups
      expect(matchups.size).toBe(6)
    })

    it('generates double round schedule correctly', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
        createMockTeam('team-3', 'Team C'),
        createMockTeam('team-4', 'Team D'),
      ]

      const schedule = generateRoundRobinSchedule(teams, true)

      expect(schedule).toHaveLength(6) // 3 rounds * 2 (double round)

      // Verify return matches exist (home/away swapped)
      const firstRoundMatch = schedule[0].matches[0]
      const returnMatch = schedule[3].matches.find(
        m => m.home.id === firstRoundMatch.away.id && m.away.id === firstRoundMatch.home.id
      )
      expect(returnMatch).toBeDefined()
    })

    it('returns empty array for 0 teams', () => {
      const schedule = generateRoundRobinSchedule([])
      expect(schedule).toEqual([])
    })

    it('returns empty array for 1 team', () => {
      const teams = [createMockTeam('team-1', 'Team A')]
      const schedule = generateRoundRobinSchedule(teams)
      expect(schedule).toEqual([])
    })

    it('assigns bye team correctly in odd team scenario', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
        createMockTeam('team-3', 'Team C'),
      ]

      const schedule = generateRoundRobinSchedule(teams)

      const byeTeams = new Set<string>()
      schedule.forEach(round => {
        round.matches.forEach(match => {
          if (match.byeTeam) {
            byeTeams.add(match.byeTeam.id)
          }
        })
      })

      // Each team should rest exactly once
      expect(byeTeams.size).toBe(3)
    })

    it('numbers rounds correctly', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
        createMockTeam('team-3', 'Team C'),
        createMockTeam('team-4', 'Team D'),
      ]

      const schedule = generateRoundRobinSchedule(teams)

      expect(schedule[0].round).toBe(1)
      expect(schedule[1].round).toBe(2)
      expect(schedule[2].round).toBe(3)
    })

    it('numbers return rounds correctly in double round', () => {
      const teams = [
        createMockTeam('team-1', 'Team A'),
        createMockTeam('team-2', 'Team B'),
        createMockTeam('team-3', 'Team C'),
        createMockTeam('team-4', 'Team D'),
      ]

      const schedule = generateRoundRobinSchedule(teams, true)

      expect(schedule[3].round).toBe(4) // First return round
      expect(schedule[4].round).toBe(5)
      expect(schedule[5].round).toBe(6)
    })
  })

  describe('getNextMatchDate', () => {
    it('returns next day when it is a valid match day', () => {
      // Thursday, looking for Friday
      const currentDate = new Date('2024-01-11') // Thursday
      const nextDate = getNextMatchDate(currentDate, ['friday'])

      expect(nextDate.getDay()).toBe(5) // Friday
      expect(nextDate.getDate()).toBe(12)
    })

    it('skips to next valid day when current day is not valid', () => {
      // Monday, looking for Friday
      const currentDate = new Date('2024-01-08') // Monday
      const nextDate = getNextMatchDate(currentDate, ['friday'])

      expect(nextDate.getDay()).toBe(5) // Friday
      expect(nextDate.getDate()).toBe(12)
    })

    it('wraps around to next week if needed', () => {
      // Saturday, looking for Monday
      const currentDate = new Date('2024-01-13') // Saturday
      const nextDate = getNextMatchDate(currentDate, ['monday'])

      expect(nextDate.getDay()).toBe(1) // Monday
      expect(nextDate.getDate()).toBe(15)
    })

    it('finds nearest day when multiple match days available', () => {
      // Wednesday, looking for Saturday or Sunday
      const currentDate = new Date('2024-01-10') // Wednesday
      const nextDate = getNextMatchDate(currentDate, ['saturday', 'sunday'])

      expect(nextDate.getDay()).toBe(6) // Saturday (comes first)
      expect(nextDate.getDate()).toBe(13)
    })

    it('handles sunday correctly', () => {
      // Saturday, looking for Sunday
      const currentDate = new Date('2024-01-13') // Saturday
      const nextDate = getNextMatchDate(currentDate, ['sunday'])

      expect(nextDate.getDay()).toBe(0) // Sunday
      expect(nextDate.getDate()).toBe(14)
    })

    it('handles all weekdays', () => {
      const currentDate = new Date('2024-01-08') // Monday
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

      days.forEach((day, index) => {
        const nextDate = getNextMatchDate(currentDate, [day])
        // Monday is 1, but if we're already on Monday, next Monday is in 1 day minimum
        expect(nextDate.getTime()).toBeGreaterThan(currentDate.getTime())
      })
    })

    it('uses default day (saturday) for invalid day name', () => {
      const currentDate = new Date('2024-01-11') // Thursday
      const nextDate = getNextMatchDate(currentDate, ['invalid' as any])

      expect(nextDate.getDay()).toBe(6) // Saturday (default)
    })

    it('handles multiple days in order', () => {
      // Monday, looking for Wednesday or Friday
      const currentDate = new Date('2024-01-08') // Monday
      const nextDate = getNextMatchDate(currentDate, ['wednesday', 'friday'])

      expect(nextDate.getDay()).toBe(3) // Wednesday (comes first)
      expect(nextDate.getDate()).toBe(10)
    })
  })

  describe('getByeTeamMessage', () => {
    it('returns correct message for team with bye', () => {
      const team = createMockTeam('team-1', 'Team A')
      const message = getByeTeamMessage(team)

      expect(message).toBe('Team A descansa esta jornada')
    })

    it('returns null when no bye team', () => {
      const message = getByeTeamMessage(undefined)
      expect(message).toBeNull()
    })

    it('returns null for bye placeholder team', () => {
      const byeTeam = createMockTeam('bye', 'Descanso')
      const message = getByeTeamMessage(byeTeam)

      expect(message).toBeNull()
    })

    it('handles team with special characters in name', () => {
      const team = createMockTeam('team-1', 'Águilas FC')
      const message = getByeTeamMessage(team)

      expect(message).toBe('Águilas FC descansa esta jornada')
    })
  })
})
