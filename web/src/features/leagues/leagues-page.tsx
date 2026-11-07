import { ArrowRight, Trophy } from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState, QueryState } from '@/components/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { useActiveLeagues } from './api'
import type { League } from './types'

/**
 * Public league directory. Reference implementation of the frontend pattern:
 * data hook from ./api, <QueryState> for loading/error/empty, semantic list,
 * links (not buttons) for navigation.
 */
export function LeaguesPage() {
  const leagues = useActiveLeagues()

  return (
    <section aria-labelledby="leagues-title" className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 space-y-1">
        <h1 id="leagues-title" className="text-2xl font-bold tracking-tight">
          Ligas disponibles
        </h1>
        <p className="text-muted-foreground">Explora las competiciones activas.</p>
      </header>

      <QueryState
        query={leagues}
        loadingLabel="Cargando ligas…"
        isEmpty={(res) => res.data.length === 0}
        empty={<EmptyState title="Aún no hay ligas activas" description="Vuelve pronto para ver las competiciones." />}
      >
        {(res) => (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {res.data.map((league) => (
              <li key={league.id}>
                <LeagueCard league={league} />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </section>
  )
}

function LeagueCard({ league }: { league: League }) {
  return (
    <Link
      to={`/liga/${league.slug}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-colors group-hover:border-primary/50">
        <CardHeader className="flex flex-row items-center gap-3">
          <Avatar className="size-12">
            {league.logo && <AvatarImage src={league.logo} alt="" />}
            <AvatarFallback aria-hidden="true">{initials(league.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">{league.name}</CardTitle>
            <CardDescription className="line-clamp-2">{league.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Trophy className="size-4" aria-hidden="true" /> Ver liga
          </span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
        </CardContent>
      </Card>
    </Link>
  )
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
