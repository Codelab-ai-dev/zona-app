export interface League {
  id: string
  name: string
  slug: string
  description: string
  logo?: string
  adminId: string
  isActive: boolean
  createdAt: string
}

export interface Tournament {
  id: string
  name: string
  leagueId: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
}

export interface Team {
  id: string
  name: string
  slug: string
  leagueId: string
  tournamentId: string
  ownerId: string
  logo?: string
  description?: string
  isActive: boolean
  createdAt: string
}

export interface Player {
  id: string
  name: string
  teamId: string
  position: string
  jerseyNumber: number
  photo?: string
  birthDate?: string
  isActive: boolean
  createdAt: string
}

export interface Match {
  id: string
  tournamentId: string
  homeTeamId: string
  awayTeamId: string
  homeScore?: number
  awayScore?: number
  matchDate: string
  status: "scheduled" | "in_progress" | "finished" | "cancelled"
  createdAt: string
}

export interface PlayerStats {
  id: string
  playerId: string
  matchId: string
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  minutesPlayed: number
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: "super_admin" | "league_admin" | "team_owner" | "public"
  password: string
  leagueId?: string
  teamId?: string
  isActive: boolean
  createdAt: string
}
