"use client"

import { useCallback } from 'react'
import { useTeamStore } from '../stores/team-store'
import { teamActions } from '../actions/team-actions'

export function useTeams() {
  const {
    teams,
    currentTeam,
    players,
    matches,
    playerStats,
    loading,
    error,
  } = useTeamStore()

  const getTeamsByLeague = useCallback(async (leagueId: string) => {
    return teamActions.getTeamsByLeague(leagueId)
  }, [])

  const getTeamsByOwner = useCallback(async () => {
    return teamActions.getTeamsByOwner()
  }, [])

  const getTeamBySlug = useCallback(async (slug: string, leagueId: string) => {
    return teamActions.getTeamBySlug(slug, leagueId)
  }, [])

  const getTeamById = useCallback(async (teamId: string) => {
    return teamActions.getTeamById(teamId)
  }, [])

  const createTeam = useCallback(async (teamData: any) => {
    return teamActions.createTeam(teamData)
  }, [])

  const createTeamWithOwner = useCallback(async (teamData: any) => {
    return teamActions.createTeamWithOwner(teamData)
  }, [])

  const createTeamWithNewOwner = useCallback(async (teamData: any, ownerData: any) => {
    return teamActions.createTeamWithNewOwner(teamData, ownerData)
  }, [])

  const updateTeam = useCallback(async (teamId: string, updates: any) => {
    return teamActions.updateTeam(teamId, updates)
  }, [])

  const getPlayersByTeam = useCallback(async (teamId: string) => {
    return teamActions.getPlayersByTeam(teamId)
  }, [])

  const createPlayer = useCallback(async (playerData: any) => {
    return teamActions.createPlayer(playerData)
  }, [])

  const updatePlayer = useCallback(async (playerId: string, updates: any) => {
    return teamActions.updatePlayer(playerId, updates)
  }, [])

  const deletePlayer = useCallback(async (playerId: string) => {
    return teamActions.deletePlayer(playerId)
  }, [])

  const getMatchesByTeam = useCallback(async (teamId: string) => {
    return teamActions.getMatchesByTeam(teamId)
  }, [])

  const getTeamStats = useCallback(async (teamId: string) => {
    return teamActions.getTeamStats(teamId)
  }, [])

  return {
    teams,
    currentTeam,
    players,
    matches,
    playerStats,
    loading,
    error,
    getTeamsByLeague,
    getTeamsByOwner,
    getTeamBySlug,
    getTeamById,
    createTeam,
    createTeamWithOwner,
    createTeamWithNewOwner,
    updateTeam,
    getPlayersByTeam,
    createPlayer,
    updatePlayer,
    deletePlayer,
    getMatchesByTeam,
    getTeamStats,
  }
}