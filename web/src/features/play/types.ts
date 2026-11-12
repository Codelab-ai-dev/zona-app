/** Mirrors backend/internal/play JSON types. */

export type RecordingStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'failed'
export type Visibility = 'public' | 'private' | 'unlisted' | 'premium'
export type SourceType = 'manual' | 'xbotgo' | 'stream_archive'
export type StreamStatus = 'idle' | 'connecting' | 'live' | 'ended' | 'failed'
export type StreamSourceType = 'xbotgo' | 'obs' | 'mobile' | 'web'
export type ClipType = 'goal' | 'save' | 'yellow_card' | 'red_card' | 'penalty' | 'highlight' | 'custom' | 'ai_generated'

export interface TeamRef {
  id: string
  name: string
  logo?: string
}

export interface LeagueRef {
  id: string
  name: string
  slug: string
}

export interface Recording {
  id: string
  match_id?: string
  league_id?: string
  tournament_id?: string
  source_type: SourceType
  source_device_id?: string
  video_url?: string
  mux_asset_id?: string
  mux_playback_id?: string
  title: string
  description?: string
  thumbnail_url?: string
  duration_seconds?: number
  resolution?: string
  file_size_bytes?: number
  status: RecordingStatus
  processing_progress: number
  error_message?: string
  visibility: Visibility
  is_premium: boolean
  price_cents?: number
  views_count: number
  likes_count: number
  published_at?: string
  uploaded_by: string
  home_score?: number
  away_score?: number
  home_team?: TeamRef
  away_team?: TeamRef
  league?: LeagueRef
  created_at: string
  updated_at: string
}

export interface Clip {
  id: string
  recording_id?: string
  match_id?: string
  league_id?: string
  clip_type?: ClipType
  clip_url?: string
  mux_asset_id?: string
  mux_playback_id?: string
  thumbnail_url?: string
  start_time_seconds: number
  end_time_seconds: number
  duration_seconds: number
  title: string
  description?: string
  match_minute?: number
  player_id?: string
  team_id?: string
  ai_generated: boolean
  ai_confidence?: number
  views_count: number
  likes_count: number
  is_featured: boolean
  created_by: string
  created_at: string
}

export interface Stream {
  id: string
  match_id?: string
  league_id?: string
  mux_live_stream_id?: string
  mux_stream_key?: string
  mux_playback_id?: string
  recording_id?: string
  recording_asset_id?: string
  recording_playback_id?: string
  recording_ready: boolean
  title: string
  description?: string
  thumbnail_url?: string
  status: StreamStatus
  source_type: StreamSourceType
  is_pay_per_view: boolean
  price_cents?: number
  current_viewers: number
  scheduled_start?: string
  actual_start?: string
  ended_at?: string
  broadcaster_id: string
  created_at: string
}

export interface Upload {
  id: string
  url: string
}

export interface DirectUploadResponse {
  recording: Recording
  upload: Upload
}
