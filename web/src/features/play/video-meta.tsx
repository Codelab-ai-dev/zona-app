import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'

import type { Recording } from './types'

/** "Local vs Visitante" when the match is known, the recording title otherwise. */
export function videoTitle(video: Recording): string {
  if (video.home_team || video.away_team) {
    return `${video.home_team?.name ?? 'Local'} vs ${video.away_team?.name ?? 'Visitante'}`
  }
  return video.title
}

export function videoScore(video: Recording): string | null {
  return video.home_score != null && video.away_score != null ? `${video.home_score} - ${video.away_score}` : null
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '--:--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const mm = m.toString().padStart(2, '0')
  const ss = s.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

export function LeagueBadge({ video, className = '' }: { video: Recording; className?: string }) {
  if (!video.league) return null
  return (
    <Badge variant="secondary" className={`bg-primary/90 text-primary-foreground text-xs ${className}`}>
      {video.league.name}
    </Badge>
  )
}

/** Home and away team cards linking to their Zona Play team page. */
export function TeamLinks({ video }: { video: Recording }) {
  const teams = [
    { team: video.home_team, role: 'Local' },
    { team: video.away_team, role: 'Visitante' },
  ]
  if (!video.home_team && !video.away_team) return null
  return (
    <ul className="grid grid-cols-2 gap-4 py-4">
      {teams.map(({ team, role }) => (
        <li key={role}>
          {team ? (
            <Link
              to={`/play/team/${team.id}`}
              className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <TeamAvatar name={team.name} logo={team.logo} />
              <span>
                <span className="block font-semibold">{team.name}</span>
                <span className="block text-sm text-muted-foreground">{role}</span>
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
              <TeamAvatar name={role} />
              <span className="font-semibold">{role}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function TeamAvatar({ name, logo }: { name: string; logo?: string }) {
  return logo ? (
    <img src={logo} alt="" className="size-12 rounded-full object-cover" />
  ) : (
    <span className="flex size-12 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase" aria-hidden="true">
      {name.slice(0, 2)}
    </span>
  )
}
