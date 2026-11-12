import { useState } from 'react'

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // storage blocked (private mode, disabled cookies): work without it
  }
}

/**
 * Remembers the selected league per feature area. Persistence is best-effort:
 * if localStorage is unavailable the selection still works for this session.
 */
export function useLeagueSelector(area: string) {
  const storageKey = `league-admin:${area}:selectedLeague`
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(() => readStored(storageKey))

  const select = (id: string) => {
    setSelectedLeagueId(id)
    try {
      localStorage.setItem(storageKey, id)
    } catch {
      // not persisted; the in-memory selection above is enough
    }
  }

  return { selectedLeagueId, setSelectedLeagueId: select }
}
