import { useState } from 'react'

import { EditTeamDialog } from './edit-team-dialog'
import { TeamCard } from './team-card'
import { ToggleActiveDialog } from './toggle-active-dialog'

import type { Team } from '../types'

interface TeamsTableProps {
  teams: Team[]
  tournamentNames?: Record<string, string>
  /** owner id -> name */
  ownerNames?: Record<string, string>
}

export function TeamsTable({ teams, tournamentNames, ownerNames }: TeamsTableProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [toggleTeam, setToggleTeam] = useState<Team | null>(null)

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            tournamentName={tournamentNames?.[team.tournament_id ?? '']}
            ownerName={ownerNames?.[team.owner_id]}
            onEdit={setSelectedTeam}
            onToggle={setToggleTeam}
          />
        ))}
      </div>

      {selectedTeam && (
        <EditTeamDialog key={selectedTeam.id} team={selectedTeam} open onOpenChange={(open) => !open && setSelectedTeam(null)} />
      )}
      <ToggleActiveDialog team={toggleTeam} onClose={() => setToggleTeam(null)} />
    </>
  )
}
