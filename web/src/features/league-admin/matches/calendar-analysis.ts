import type { CreateMatchRequest, MatchWithRelations, TeamSummary } from './types'

/** Minutes between two kick-offs of the same field (the original used 75). */
export const SLOT_MINUTES = 75

export interface TeamStat {
  teamId: string
  teamName: string
  total: number
  finished: number
}

export interface MissingPair {
  homeId: string
  awayId: string
  homeName: string
  awayName: string
}

export interface CalendarConfig {
  /** 0 = Sunday … 6 = Saturday */
  weekdays: number[]
  /** HH:MM of the earliest kick-off */
  startTime: string
  fields: number
}

export interface CalendarAnalysis {
  activeTeams: TeamSummary[]
  /** Active teams with no regular-phase match at all. */
  withoutMatches: TeamSummary[]
  /** Teams with matches that are no longer active in the tournament. */
  inactiveWithMatches: TeamStat[]
  teamStats: TeamStat[]
  missingPairs: MissingPair[]
  hasCalendar: boolean
  doubleRound: boolean
  hasOddTeams: boolean
  finishedRounds: number
  lastFinishedRound: number
  lastRound: number
  config: CalendarConfig
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/**
 * Compares the active teams of the tournament with its regular-phase matches:
 * which teams have no matches and which pairings of the round robin are
 * missing (once, or twice when the calendar is a double round).
 */
export function analyzeCalendar(
  teams: TeamSummary[],
  allMatches: MatchWithRelations[],
  /** Regeneration: build the pairings even if no match is left, with the format of the old calendar. */
  force?: { doubleRound: boolean },
): CalendarAnalysis {
  const matches = allMatches.filter((m) => m.phase === 'regular' && m.status !== 'cancelled')
  const activeTeams = teams.filter((t) => t.is_active)
  const names = new Map(teams.map((t) => [t.id, t.name]))
  allMatches.forEach((m) => {
    names.set(m.home_team_id, names.get(m.home_team_id) ?? m.home_team_name)
    names.set(m.away_team_id, names.get(m.away_team_id) ?? m.away_team_name)
  })

  const stats = new Map<string, TeamStat>()
  const stat = (id: string) => {
    let s = stats.get(id)
    if (!s) {
      s = { teamId: id, teamName: names.get(id) ?? id, total: 0, finished: 0 }
      stats.set(id, s)
    }
    return s
  }
  const pairCount = new Map<string, number>()
  matches.forEach((m) => {
    for (const id of [m.home_team_id, m.away_team_id]) {
      const s = stat(id)
      s.total++
      if (m.status === 'finished') s.finished++
    }
    const k = pairKey(m.home_team_id, m.away_team_id)
    pairCount.set(k, (pairCount.get(k) ?? 0) + 1)
  })
  activeTeams.forEach((t) => stat(t.id))

  const activeIds = new Set(activeTeams.map((t) => t.id))
  const doubleRound = force?.doubleRound ?? Math.max(0, ...pairCount.values()) >= 2
  const expected = doubleRound ? 2 : 1

  const missingPairs: MissingPair[] = []
  if (matches.length > 0 || force) {
    for (let i = 0; i < activeTeams.length; i++) {
      for (let j = i + 1; j < activeTeams.length; j++) {
        const a = activeTeams[i]
        const b = activeTeams[j]
        if (!a || !b) continue
        const have = pairCount.get(pairKey(a.id, b.id)) ?? 0
        for (let n = have; n < expected; n++) {
          // The second leg is played with the venues reversed.
          const flip = n % 2 === 1
          const [home, away] = flip ? [b, a] : [a, b]
          missingPairs.push({ homeId: home.id, awayId: away.id, homeName: home.name, awayName: away.name })
        }
      }
    }
  }

  const rounds = (status?: string) =>
    matches.filter((m) => m.round !== undefined && (!status || m.status === status)).map((m) => m.round as number)
  const finished = rounds('finished')

  return {
    activeTeams,
    withoutMatches: activeTeams.filter((t) => (stats.get(t.id)?.total ?? 0) === 0),
    inactiveWithMatches: [...stats.values()].filter((s) => !activeIds.has(s.teamId) && s.total > 0),
    teamStats: activeTeams.map((t) => stat(t.id)),
    missingPairs,
    hasCalendar: matches.length > 0,
    doubleRound,
    hasOddTeams: activeTeams.length % 2 === 1,
    finishedRounds: new Set(finished).size,
    lastFinishedRound: Math.max(0, ...finished),
    lastRound: Math.max(0, ...rounds()),
    config: detectConfig(matches),
  }
}

/**
 * "Regenerar" of Ajustar Calendario: the scheduled matches are deleted and the
 * pairings the active teams still have to play (the finished / in progress /
 * cancelled ones are kept and not repeated) are packed into new rounds after
 * the last kept one, with the weekdays, start time and fields of the whole
 * current calendar.
 */
export function analyzeRegeneration(teams: TeamSummary[], allMatches: MatchWithRelations[]) {
  const full = analyzeCalendar(teams, allMatches)
  const kept = allMatches.filter((m) => m.status !== 'scheduled' || m.phase !== 'regular')
  const scheduled = allMatches.filter((m) => m.status === 'scheduled' && m.phase === 'regular')
  const analysis = { ...analyzeCalendar(teams, kept, { doubleRound: full.doubleRound }), config: full.config }
  return { analysis, kept, scheduled }
}

function detectConfig(matches: MatchWithRelations[]): CalendarConfig {
  if (matches.length === 0) return { weekdays: [0], startTime: '08:00', fields: 1 }
  const weekdays = new Set<number>()
  let earliest = Infinity
  let fields = 1
  matches.forEach((m) => {
    weekdays.add(new Date(m.match_date).getUTCDay())
    if (m.match_time) {
      const [h = 0, min = 0] = m.match_time.split(':').map(Number)
      earliest = Math.min(earliest, h * 60 + min)
    }
    fields = Math.max(fields, m.field_number ?? 1)
  })
  const start = Number.isFinite(earliest) ? earliest : 8 * 60
  return { weekdays: [...weekdays].sort(), startTime: toHHMM(start), fields }
}

function toHHMM(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Next date (YYYY-MM-DD, UTC) strictly after `after` that falls on one of `weekdays`. */
function nextPlayDate(after: Date, weekdays: number[]): Date {
  const d = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate()))
  for (let i = 0; i < 8; i++) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (weekdays.includes(d.getUTCDay())) return d
  }
  return d
}

/** Packs pairs into rounds where no team plays twice. */
export function packRounds(pairs: MissingPair[]): MissingPair[][] {
  const remaining = [...pairs]
  const rounds: MissingPair[][] = []
  while (remaining.length > 0) {
    const busy = new Set<string>()
    const round: MissingPair[] = []
    for (let i = 0; i < remaining.length; ) {
      const p = remaining[i]
      if (p && !busy.has(p.homeId) && !busy.has(p.awayId)) {
        busy.add(p.homeId)
        busy.add(p.awayId)
        round.push(p)
        remaining.splice(i, 1)
      } else {
        i++
      }
    }
    rounds.push(round)
  }
  return rounds
}

/**
 * Builds the bulk-create payload for the missing pairings: new rounds after
 * the last existing one, on the weekdays / start time / fields detected in the
 * current calendar, starting after the last scheduled date.
 */
export function buildMissingMatches(analysis: CalendarAnalysis, allMatches: MatchWithRelations[]): CreateMatchRequest[] {
  const { config } = analysis
  const regular = allMatches.filter((m) => m.phase === 'regular')
  const last = regular.reduce((max, m) => Math.max(max, new Date(m.match_date).getTime()), 0)
  let date = new Date(last || Date.now())
  const [startH = 8, startM = 0] = config.startTime.split(':').map(Number)
  const out: CreateMatchRequest[] = []

  packRounds(analysis.missingPairs).forEach((round, ri) => {
    date = nextPlayDate(date, config.weekdays)
    const iso = date.toISOString().slice(0, 10)
    round.forEach((p, i) => {
      const slot = Math.floor(i / config.fields)
      const time = toHHMM(startH * 60 + startM + slot * SLOT_MINUTES)
      out.push({
        home_team_id: p.homeId,
        away_team_id: p.awayId,
        match_date: `${iso}T${time}:00Z`,
        match_time: time,
        round: analysis.lastRound + ri + 1,
        field_number: (i % config.fields) + 1,
      })
    })
  })
  return out
}
