/** Mirrors backend/internal/matches Match, Goal, Card, Incident, RefereeReport JSON. */

export type MatchStatus = 'scheduled' | 'in_progress' | 'finished' | 'cancelled'
export type CardType = 'yellow' | 'red'
export type GoalType = 'normal' | 'penalty' | 'own_goal' | 'free_kick'
export type Phase = 'regular' | 'playoffs'
export type PlayoffRound = 'quarterfinals' | 'semifinals' | 'final' | 'third_place'
export type Leg = 'first' | 'second'

export interface Team {
  id: string
  name: string
  slug: string
  logo?: string
}

export interface Goal {
  id: string
  match_id: string
  player_id: string
  team_id: string
  minute: number
  goal_type: GoalType
  assist_player_id?: string
  description?: string
  created_at: string
}

export interface Card {
  id: string
  match_id: string
  player_id: string
  team_id: string
  card_type: CardType
  minute: number
  reason?: string
  created_at: string
}

export interface Incident {
  id: string
  match_id: string
  incident_type: string
  description: string
  minute?: number
  player_id?: string
  team_id?: string
  created_at: string
}

export interface RefereeReport {
  id: string
  match_id: string
  referee_name?: string
  assistant_referee_1?: string
  assistant_referee_2?: string
  fourth_official?: string
  general_observations?: string
  weather_conditions?: string
  field_conditions?: string
  created_at: string
  updated_at: string
}

export interface Match {
  id: string
  tournament_id: string
  home_team_id: string
  away_team_id: string
  home_score: number
  away_score: number
  match_date: string
  match_time?: string
  status: MatchStatus
  round?: number
  field_number?: number
  phase: Phase
  playoff_round?: PlayoffRound
  playoff_position?: number
  leg?: Leg
  bye_team_id?: string
  is_published: boolean
  created_at: string
  updated_at: string
  home_team_name: string
  away_team_name: string
  home_team_logo?: string
  away_team_logo?: string
}

export interface MatchWithRelations extends Match {
  goals?: Goal[]
  cards?: Card[]
  incidents?: Incident[]
}

export interface AttendanceRecord {
  player_id: string
  player_name: string
  jersey_number?: number
  recognition_mode: string
  confidence_score: number
  similarity_score: number
  timestamp: string
  source: 'qr' | 'facial'
}

// DTOs for API requests
export interface UpdateMatchScheduleRequest {
  match_date?: string
  match_time?: string
  field_number?: number
  round?: number
}

export interface PostMatchResultRequest {
  home_score: number
  away_score: number
  goals?: PostGoalRequest[]
  cards?: PostCardRequest[]
  observations?: string
  incidents?: PostIncidentRequest[]
}

export interface PostGoalRequest {
  player_id: string
  team_id: string
  minute: number
  goal_type: GoalType
  assist_player_id?: string
  description?: string
}

export interface PostCardRequest {
  player_id: string
  team_id: string
  card_type: CardType
  minute: number
  reason?: string
}

export interface PostIncidentRequest {
  incident_type: string
  description: string
  minute?: number
  player_id?: string
  team_id?: string
}

export interface PostRefereeReportRequest {
  referee_name?: string
  assistant_referee_1?: string
  assistant_referee_2?: string
  fourth_official?: string
  general_observations?: string
  weather_conditions?: string
  field_conditions?: string
}

export interface PublishMatchRequest {
  is_published: boolean
}

export interface TriggerEmbeddingRequest {
  trigger_type: string
  league_id: string
  tournament_id: string
  match_id?: string
  round?: number
}
