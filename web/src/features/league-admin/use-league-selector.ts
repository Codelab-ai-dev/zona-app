import { useState, useEffect } from 'react'

/**
 * Persists the selected league per feature area (fixtures, playoffs, etc).
 * Uses localStorage to remember the user's choice.
 */
export function useLeagueSelector(area: string) {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)

  const storageKey = `league-admin:${area}:selectedLeague`

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setSelectedLeagueId(stored)
    } catch {
      // localStorage may not be available in some environments
    }
  }, [storageKey])

  // Save to localStorage when changed
  const handleSetLeagueId = (id: string) => {
    setSelectedLeagueId(id)
    try {
      localStorage.setItem(storageKey, id)
    } catch {
      // localStorage may not be available in some environments
    }
  }

  return {
    selectedLeagueId,
    setSelectedLeagueId: handleSetLeagueId,
  }
}
