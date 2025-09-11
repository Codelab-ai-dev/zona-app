"use client"

import { useCallback } from 'react'
import { useLeagueStore } from '../stores/league-store'
import { leagueActions } from '../actions/league-actions'

export function useLeagues() {
  const {
    leagues,
    currentLeague,
    tournaments,
    teams,
    loading,
    error,
  } = useLeagueStore()

  const getActiveLeagues = useCallback(async () => {
    return leagueActions.getActiveLeagues()
  }, [])

  const getAllLeagues = useCallback(async () => {
    return leagueActions.getAllLeagues()
  }, [])

  const getLeaguesByAdmin = useCallback(async () => {
    return leagueActions.getLeaguesByAdmin()
  }, [])

  const getLeagueBySlug = useCallback(async (slug: string) => {
    return leagueActions.getLeagueBySlug(slug)
  }, [])

  const createLeague = useCallback(async (leagueData: any) => {
    return leagueActions.createLeague(leagueData)
  }, [])

  const createLeagueWithAdmin = useCallback(async (leagueData: any) => {
    return leagueActions.createLeagueWithAdmin(leagueData)
  }, [])

  const updateLeague = useCallback(async (leagueId: string, updates: any) => {
    return leagueActions.updateLeague(leagueId, updates)
  }, [])

  const deleteLeague = useCallback(async (leagueId: string) => {
    return leagueActions.deleteLeague(leagueId)
  }, [])

  const getTournamentsByLeague = useCallback(async (leagueId: string) => {
    return leagueActions.getTournamentsByLeague(leagueId)
  }, [])

  const getTeamsByLeague = useCallback(async (leagueId: string) => {
    return leagueActions.getTeamsByLeague(leagueId)
  }, [])

  const getLeagueStats = useCallback(async (leagueId: string) => {
    return leagueActions.getLeagueStats(leagueId)
  }, [])

  return {
    leagues,
    currentLeague,
    tournaments,
    teams,
    loading,
    error,
    getActiveLeagues,
    getAllLeagues,
    getLeaguesByAdmin,
    getLeagueBySlug,
    createLeague,
    createLeagueWithAdmin,
    updateLeague,
    deleteLeague,
    getTournamentsByLeague,
    getTeamsByLeague,
    getLeagueStats,
  }
}