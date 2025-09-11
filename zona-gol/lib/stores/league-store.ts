import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Database } from '../supabase/database.types'

type League = Database['public']['Tables']['leagues']['Row']
type Tournament = Database['public']['Tables']['tournaments']['Row']
type Team = Database['public']['Tables']['teams']['Row']

interface LeagueState {
  leagues: League[]
  currentLeague: League | null
  tournaments: Tournament[]
  teams: Team[]
  loading: boolean
  error: string | null
}

interface LeagueActions {
  setLeagues: (leagues: League[]) => void
  setCurrentLeague: (league: League | null) => void
  setTournaments: (tournaments: Tournament[]) => void
  setTeams: (teams: Team[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addLeague: (league: League) => void
  updateLeague: (league: League) => void
  removeLeague: (leagueId: string) => void
  addTournament: (tournament: Tournament) => void
  updateTournament: (tournament: Tournament) => void
  removeTournament: (tournamentId: string) => void
  addTeam: (team: Team) => void
  updateTeam: (team: Team) => void
  removeTeam: (teamId: string) => void
  reset: () => void
}

type LeagueStore = LeagueState & LeagueActions

const initialState: LeagueState = {
  leagues: [],
  currentLeague: null,
  tournaments: [],
  teams: [],
  loading: false,
  error: null,
}

export const useLeagueStore = create<LeagueStore>()(
  immer((set) => ({
    ...initialState,

    setLeagues: (leagues) =>
      set((state) => {
        state.leagues = leagues
      }),

    setCurrentLeague: (league) =>
      set((state) => {
        state.currentLeague = league
      }),

    setTournaments: (tournaments) =>
      set((state) => {
        state.tournaments = tournaments
      }),

    setTeams: (teams) =>
      set((state) => {
        state.teams = teams
      }),

    setLoading: (loading) =>
      set((state) => {
        state.loading = loading
      }),

    setError: (error) =>
      set((state) => {
        state.error = error
      }),

    addLeague: (league) =>
      set((state) => {
        state.leagues.push(league)
      }),

    updateLeague: (updatedLeague) =>
      set((state) => {
        const index = state.leagues.findIndex((l) => l.id === updatedLeague.id)
        if (index !== -1) {
          state.leagues[index] = updatedLeague
        }
        if (state.currentLeague?.id === updatedLeague.id) {
          state.currentLeague = updatedLeague
        }
      }),

    removeLeague: (leagueId) =>
      set((state) => {
        state.leagues = state.leagues.filter((l) => l.id !== leagueId)
        if (state.currentLeague?.id === leagueId) {
          state.currentLeague = null
        }
      }),

    addTournament: (tournament) =>
      set((state) => {
        state.tournaments.push(tournament)
      }),

    updateTournament: (updatedTournament) =>
      set((state) => {
        const index = state.tournaments.findIndex((t) => t.id === updatedTournament.id)
        if (index !== -1) {
          state.tournaments[index] = updatedTournament
        }
      }),

    removeTournament: (tournamentId) =>
      set((state) => {
        state.tournaments = state.tournaments.filter((t) => t.id !== tournamentId)
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

    reset: () =>
      set(() => ({ ...initialState })),
  }))
)