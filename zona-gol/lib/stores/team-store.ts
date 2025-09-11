import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Database } from '../supabase/database.types'

type Team = Database['public']['Tables']['teams']['Row']
type Player = Database['public']['Tables']['players']['Row']
type Match = Database['public']['Tables']['matches']['Row']
type PlayerStats = Database['public']['Tables']['player_stats']['Row']

interface TeamState {
  teams: Team[]
  currentTeam: Team | null
  players: Player[]
  matches: Match[]
  playerStats: PlayerStats[]
  loading: boolean
  error: string | null
}

interface TeamActions {
  setTeams: (teams: Team[]) => void
  addTeam: (team: Team) => void
  updateTeam: (team: Team) => void
  removeTeam: (teamId: string) => void
  setCurrentTeam: (team: Team | null) => void
  setPlayers: (players: Player[]) => void
  setMatches: (matches: Match[]) => void
  setPlayerStats: (stats: PlayerStats[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addPlayer: (player: Player) => void
  updatePlayer: (player: Player) => void
  removePlayer: (playerId: string) => void
  addMatch: (match: Match) => void
  updateMatch: (match: Match) => void
  removeMatch: (matchId: string) => void
  addPlayerStat: (stat: PlayerStats) => void
  updatePlayerStat: (stat: PlayerStats) => void
  removePlayerStat: (statId: string) => void
  reset: () => void
}

type TeamStore = TeamState & TeamActions

const initialState: TeamState = {
  teams: [],
  currentTeam: null,
  players: [],
  matches: [],
  playerStats: [],
  loading: false,
  error: null,
}

export const useTeamStore = create<TeamStore>()(
  immer((set) => ({
    ...initialState,

    setTeams: (teams) =>
      set((state) => {
        state.teams = teams
      }),

    addTeam: (team) =>
      set((state) => {
        state.teams.push(team)
      }),

    updateTeam: (updatedTeam) =>
      set((state) => {
        const index = state.teams.findIndex((t) => t.id === updatedTeam.id)
        if (index !== -1) {
          state.teams[index] = updatedTeam
        }
      }),

    removeTeam: (teamId) =>
      set((state) => {
        state.teams = state.teams.filter((t) => t.id !== teamId)
      }),

    setCurrentTeam: (team) =>
      set((state) => {
        state.currentTeam = team
      }),

    setPlayers: (players) =>
      set((state) => {
        state.players = players
      }),

    setMatches: (matches) =>
      set((state) => {
        state.matches = matches
      }),

    setPlayerStats: (stats) =>
      set((state) => {
        state.playerStats = stats
      }),

    setLoading: (loading) =>
      set((state) => {
        state.loading = loading
      }),

    setError: (error) =>
      set((state) => {
        state.error = error
      }),

    addPlayer: (player) =>
      set((state) => {
        state.players.push(player)
      }),

    updatePlayer: (updatedPlayer) =>
      set((state) => {
        const index = state.players.findIndex((p) => p.id === updatedPlayer.id)
        if (index !== -1) {
          state.players[index] = updatedPlayer
        }
      }),

    removePlayer: (playerId) =>
      set((state) => {
        state.players = state.players.filter((p) => p.id !== playerId)
      }),

    addMatch: (match) =>
      set((state) => {
        state.matches.push(match)
      }),

    updateMatch: (updatedMatch) =>
      set((state) => {
        const index = state.matches.findIndex((m) => m.id === updatedMatch.id)
        if (index !== -1) {
          state.matches[index] = updatedMatch
        }
      }),

    removeMatch: (matchId) =>
      set((state) => {
        state.matches = state.matches.filter((m) => m.id !== matchId)
      }),

    addPlayerStat: (stat) =>
      set((state) => {
        state.playerStats.push(stat)
      }),

    updatePlayerStat: (updatedStat) =>
      set((state) => {
        const index = state.playerStats.findIndex((s) => s.id === updatedStat.id)
        if (index !== -1) {
          state.playerStats[index] = updatedStat
        }
      }),

    removePlayerStat: (statId) =>
      set((state) => {
        state.playerStats = state.playerStats.filter((s) => s.id !== statId)
      }),

    reset: () =>
      set(() => ({ ...initialState })),
  }))
)