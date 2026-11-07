/** JSON fixtures shaped like the Go API (backend/internal/{leagues,teams,matches,stats}). */
export const page = { limit: 100, offset: 0 }

export const league = {
  id: 'l1', name: 'Liga Norte', slug: 'liga-norte', description: 'Fútbol 7 los domingos',
  admin_id: 'a1', is_active: true, product_mode: 'full', created_at: '', updated_at: '',
}

export const league2 = { ...league, id: 'l2', name: 'Liga Sur', slug: 'liga-sur', description: 'Fútbol 11' }

export const tournament = {
  id: 't1', name: 'Torneo Apertura', league_id: 'l1', start_date: '2024-01-01', end_date: '2099-12-31',
  is_active: true, registration_open: false, tournament_format: 'round_robin', rounds_per_season: 10,
  has_third_place_match: false, age_validation_enabled: false, id_document_required: false,
  created_at: '', updated_at: '',
}

export const standingA = {
  position: 1, team_id: 'team1', team_name: 'Tigres FC', matches_played: 5, matches_won: 4, matches_drawn: 1,
  matches_lost: 0, goals_for: 15, goals_against: 5, goal_difference: 10, points: 13, points_adjustment: 0,
}
export const standingB = {
  position: 2, team_id: 'team2', team_name: 'Leones United', matches_played: 5, matches_won: 3, matches_drawn: 1,
  matches_lost: 1, goals_for: 9, goals_against: 6, goal_difference: 3, points: 10, points_adjustment: -3,
  adjustment_reason: 'Alineación indebida',
}

export const matchFinished = {
  id: 'm1', tournament_id: 't1', home_team_id: 'team1', away_team_id: 'team2', home_score: 3, away_score: 1,
  match_date: '2024-02-01T00:00:00Z', match_time: '19:00', status: 'finished', round: 5, phase: 'regular',
  is_published: true, created_at: '', updated_at: '',
}
export const matchScheduled = {
  ...matchFinished, id: 'm2', home_team_id: 'team2', away_team_id: 'team1', home_score: 0, away_score: 0,
  match_date: '2024-02-08T00:00:00Z', match_time: '20:30', status: 'scheduled', round: 6,
}

export const scorer = {
  id: 's1', player_id: 'p1', player_name: 'Juan Pérez', jersey_number: 9, team_id: 'team1', team_name: 'Tigres FC',
  matches_played: 5, goals: 7, assists: 2, yellow_cards: 0, red_cards: 0, minutes_played: 400,
}
export const carded = {
  ...scorer, id: 's2', player_id: 'p2', player_name: 'Luis Gómez', team_id: 'team2', team_name: 'Leones United',
  goals: 0, assists: 0, yellow_cards: 3, red_cards: 1,
}

export const team = {
  id: 'team1', name: 'Tigres FC', slug: 'tigres-fc', league_id: 'l1', owner_id: 'o1', description: 'Campeones 2023',
  is_active: true, created_at: '', updated_at: '',
}
export const team2 = { ...team, id: 'team2', name: 'Leones United', slug: 'leones' }

export const player = {
  id: 'pl1', name: 'Carlos Ruiz', team_id: 'team1', position: 'Delantero', jersey_number: 10, is_active: true,
}
export const staff = { id: 'st1', team_id: 'team1', name: 'Mario López', role: 'Director técnico', is_active: true }

export const teamStats = {
  team_id: 'team1', tournament_id: 't1', matches_played: 5, matches_won: 4, matches_drawn: 1, matches_lost: 0,
  goals_for: 15, goals_against: 5, goal_difference: 10, points: 13, points_adjustment: -1,
}

export const apiError = (message: string) => ({ error: { code: 'internal_error', message } })
