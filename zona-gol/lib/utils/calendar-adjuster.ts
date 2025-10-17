/**
 * Utilidades para ajustar el calendario cuando equipos abandonan la liga
 */

import { Database } from "@/lib/supabase/database.types"

type Team = Database['public']['Tables']['teams']['Row']
type Match = Database['public']['Tables']['matches']['Row']

export interface TeamMatchStats {
  teamId: string
  teamName: string
  totalMatches: number
  finishedMatches: number
  scheduledMatches: number
  lastMatchDate: string | null
  isActive: boolean
  isApproved: boolean
  inactivityReason?: string
}

export interface CalendarAdjustmentResult {
  activeTeams: Team[]
  inactiveTeams: Team[]
  teamStats: TeamMatchStats[]
  hasOddTeams: boolean
  suggestedAction: 'regenerate' | 'keep_current' | 'warning'
  message: string
}

/**
 * Analiza los equipos y determina cuáles están activos basándose en partidos finalizados
 */
export function analyzeTeamActivity(
  teams: Team[],
  matches: Match[],
  inactivityThreshold: number = 3 // Número de partidos programados sin jugar para considerar inactivo
): CalendarAdjustmentResult {
  const teamStats: TeamMatchStats[] = teams.map(team => {
    const teamMatches = matches.filter(
      m => m.home_team_id === team.id || m.away_team_id === team.id
    )

    const finishedMatches = teamMatches.filter(m => m.status === 'finished')
    const scheduledMatches = teamMatches.filter(m => m.status === 'scheduled')

    // Obtener la fecha del último partido jugado
    const lastFinishedMatch = finishedMatches
      .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())[0]

    const lastMatchDate = lastFinishedMatch ? lastFinishedMatch.match_date : null

    // Un equipo se considera activo si:
    // 1. El equipo está marcado como activo en la base de datos (is_active = true), Y
    // 2. Ha jugado al menos un partido, O tiene partidos programados
    const isActive = team.is_active && (
      finishedMatches.length > 0 ||
      scheduledMatches.length > 0
    )

    // Determinar el motivo de inactividad
    let inactivityReason = ''
    if (!team.is_active) {
      inactivityReason = 'Equipo no aprobado o desactivado'
    } else if (finishedMatches.length === 0 && scheduledMatches.length === 0) {
      inactivityReason = 'Sin partidos asignados'
    }

    return {
      teamId: team.id,
      teamName: team.name,
      totalMatches: teamMatches.length,
      finishedMatches: finishedMatches.length,
      scheduledMatches: scheduledMatches.length,
      lastMatchDate,
      isActive,
      isApproved: team.is_active,
      inactivityReason: inactivityReason || undefined
    }
  })

  const activeTeams = teams.filter(team =>
    teamStats.find(s => s.teamId === team.id)?.isActive
  )

  const inactiveTeams = teams.filter(team =>
    !teamStats.find(s => s.teamId === team.id)?.isActive
  )

  const hasOddTeams = activeTeams.length % 2 !== 0

  let suggestedAction: 'regenerate' | 'keep_current' | 'warning' = 'keep_current'
  let message = ''

  if (inactiveTeams.length > 0) {
    suggestedAction = 'regenerate'
    message = `Se detectaron ${inactiveTeams.length} equipo(s) inactivo(s). Se recomienda regenerar el calendario con los ${activeTeams.length} equipos activos.`

    if (hasOddTeams) {
      message += ` Como hay un número impar de equipos (${activeTeams.length}), un equipo descansará por jornada.`
    }
  } else if (hasOddTeams) {
    suggestedAction = 'warning'
    message = `Hay un número impar de equipos activos (${activeTeams.length}). Un equipo descansará por jornada.`
  } else {
    message = `Todos los equipos están activos (${activeTeams.length}). El calendario actual es válido.`
  }

  return {
    activeTeams,
    inactiveTeams,
    teamStats,
    hasOddTeams,
    suggestedAction,
    message
  }
}

/**
 * Genera calendario round-robin optimizado para equipos pares e impares
 * Usa el algoritmo de rotación circular
 */
export function generateRoundRobinSchedule(
  teams: Team[],
  doubleRound = false
): Array<{ round: number; matches: Array<{ home: Team; away: Team; byeTeam?: Team }> }> {
  if (teams.length < 2) return []

  const teamList = [...teams]
  const rounds: Array<{ round: number; matches: Array<{ home: Team; away: Team; byeTeam?: Team }> }> = []

  // Si hay número impar de equipos, agregar un equipo "fantasma" para descanso
  let byeTeam: Team | null = null
  if (teamList.length % 2 !== 0) {
    byeTeam = { id: 'bye', name: 'Descanso', slug: 'bye' } as Team
    teamList.push(byeTeam)
  }

  const numTeams = teamList.length
  const numRounds = numTeams - 1
  const matchesPerRound = numTeams / 2

  for (let round = 0; round < numRounds; round++) {
    const roundMatches: Array<{ home: Team; away: Team; byeTeam?: Team }> = []
    let roundByeTeam: Team | undefined = undefined

    for (let match = 0; match < matchesPerRound; match++) {
      const home = (round + match) % (numTeams - 1)
      const away = (numTeams - 1 - match + round) % (numTeams - 1)

      let homeTeam = teamList[home]
      let awayTeam = teamList[away]

      // El último equipo permanece fijo
      if (match === 0) {
        awayTeam = teamList[numTeams - 1]
      }

      // Detectar equipo que descansa esta jornada
      if (homeTeam.id === 'bye') {
        roundByeTeam = awayTeam
        continue
      }
      if (awayTeam.id === 'bye') {
        roundByeTeam = homeTeam
        continue
      }

      roundMatches.push({ home: homeTeam, away: awayTeam })
    }

    if (roundMatches.length > 0) {
      rounds.push({
        round: round + 1,
        matches: roundMatches.map(m => ({
          ...m,
          byeTeam: roundByeTeam
        }))
      })
    }
  }

  // Si es doble vuelta (ida y vuelta), agregar partidos de vuelta
  if (doubleRound) {
    const returnRounds = rounds.map(round => ({
      round: round.round + numRounds,
      matches: round.matches.map(match => ({
        home: match.away,
        away: match.home,
        byeTeam: match.byeTeam
      }))
    }))
    rounds.push(...returnRounds)
  }

  return rounds
}

/**
 * Calcula la próxima fecha disponible para partidos
 */
export function getNextMatchDate(
  currentDate: Date,
  matchDays: string[]
): Date {
  const dayOfWeek = currentDate.getDay() // 0 = Sunday, 6 = Saturday
  const targetDays = matchDays.map(day => {
    switch (day) {
      case 'sunday': return 0
      case 'monday': return 1
      case 'tuesday': return 2
      case 'wednesday': return 3
      case 'thursday': return 4
      case 'friday': return 5
      case 'saturday': return 6
      default: return 6
    }
  })

  // Encontrar el próximo día disponible
  let daysToAdd = 1
  while (!targetDays.includes((dayOfWeek + daysToAdd) % 7)) {
    daysToAdd++
    // Prevenir bucle infinito
    if (daysToAdd > 7) break
  }

  const nextDate = new Date(currentDate)
  nextDate.setDate(currentDate.getDate() + daysToAdd)
  return nextDate
}

/**
 * Formatea la información del equipo que descansa
 */
export function getByeTeamMessage(byeTeam?: Team): string | null {
  if (!byeTeam || byeTeam.id === 'bye') return null
  return `${byeTeam.name} descansa esta jornada`
}
