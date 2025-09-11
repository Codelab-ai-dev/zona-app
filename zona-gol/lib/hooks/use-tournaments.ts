"use client"

import { useCallback } from 'react'
import { useLeagueStore } from '../stores/league-store'
import { tournamentActions } from '../actions/tournament-actions'

export function useTournaments() {
  const {
    tournaments,
    loading,
    error,
  } = useLeagueStore()

  const getTournamentsByLeague = useCallback(async (leagueId: string) => {
    return tournamentActions.getTournamentsByLeague(leagueId)
  }, [])

  const createTournament = useCallback(async (tournamentData: {
    name: string
    league_id: string
    start_date: string
    end_date: string
    is_active?: boolean
  }) => {
    return tournamentActions.createTournament(tournamentData)
  }, [])

  const updateTournament = useCallback(async (tournamentId: string, updates: {
    name?: string
    start_date?: string
    end_date?: string
    is_active?: boolean
  }) => {
    return tournamentActions.updateTournament(tournamentId, updates)
  }, [])

  const deleteTournament = useCallback(async (tournamentId: string) => {
    return tournamentActions.deleteTournament(tournamentId)
  }, [])

  const getTournament = useCallback(async (tournamentId: string) => {
    return tournamentActions.getTournament(tournamentId)
  }, [])

  return {
    tournaments,
    loading,
    error,
    getTournamentsByLeague,
    createTournament,
    updateTournament,
    deleteTournament,
    getTournament,
  }
}