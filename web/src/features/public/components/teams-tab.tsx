import { Link } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/features/leagues/leagues-page'

import type { TeamLookup } from './match-list'
import { panelClass } from './public-shell'

/** Teams of the tournament, each linking to its public page. */
export function TeamsTab({ teams }: { teams: TeamLookup }) {
  const list = [...teams.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, 'es'))
  return (
    <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {list.map(([id, team]) => (
        <li key={id}>
          <Link
            to={`/equipos/${id}`}
            className={`${panelClass} flex flex-col items-center gap-2 p-4 text-center transition-colors hover:border-green-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400`}
          >
            <Avatar className="size-14 border border-white/10">
              {team.logo && <AvatarImage src={team.logo} alt="" />}
              <AvatarFallback aria-hidden="true" className="bg-green-500/20 font-bold text-green-400">{initials(team.name)}</AvatarFallback>
            </Avatar>
            <span className="line-clamp-2 text-sm font-medium text-white">{team.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
