export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      leagues: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          logo: string | null
          admin_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description: string
          logo?: string | null
          admin_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string
          logo?: string | null
          admin_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leagues_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tournaments: {
        Row: {
          id: string
          name: string
          league_id: string
          start_date: string
          end_date: string
          is_active: boolean
          max_players: number | null
          registration_open: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          league_id: string
          start_date: string
          end_date: string
          is_active?: boolean
          max_players?: number | null
          registration_open?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          league_id?: string
          start_date?: string
          end_date?: string
          is_active?: boolean
          max_players?: number | null
          registration_open?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          }
        ]
      }
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          league_id: string
          tournament_id: string | null
          owner_id: string
          logo: string | null
          description: string | null
          is_active: boolean
          home_primary_color: string | null
          home_secondary_color: string | null
          home_accent_color: string | null
          away_primary_color: string | null
          away_secondary_color: string | null
          away_accent_color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          league_id: string
          tournament_id?: string | null
          owner_id: string
          logo?: string | null
          description?: string | null
          is_active?: boolean
          home_primary_color?: string | null
          home_secondary_color?: string | null
          home_accent_color?: string | null
          away_primary_color?: string | null
          away_secondary_color?: string | null
          away_accent_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          league_id?: string
          tournament_id?: string | null
          owner_id?: string
          logo?: string | null
          description?: string | null
          is_active?: boolean
          home_primary_color?: string | null
          home_secondary_color?: string | null
          home_accent_color?: string | null
          away_primary_color?: string | null
          away_secondary_color?: string | null
          away_accent_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          }
        ]
      }
      players: {
        Row: {
          id: string
          name: string
          team_id: string
          position: string
          jersey_number: number
          photo: string | null
          birth_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          team_id: string
          position: string
          jersey_number: number
          photo?: string | null
          birth_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          team_id?: string
          position?: string
          jersey_number?: number
          photo?: string | null
          birth_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          home_team_id: string
          away_team_id: string
          home_score: number | null
          away_score: number | null
          match_date: string
          match_time: string | null
          field_number: number | null
          round: number | null
          status: "scheduled" | "in_progress" | "finished" | "cancelled"
          phase: "regular" | "playoffs"
          playoff_round: "quarterfinals" | "semifinals" | "final" | "third_place" | null
          playoff_position: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          home_team_id: string
          away_team_id: string
          home_score?: number | null
          away_score?: number | null
          match_date: string
          match_time?: string | null
          field_number?: number | null
          round?: number | null
          status?: "scheduled" | "in_progress" | "finished" | "cancelled"
          phase?: "regular" | "playoffs"
          playoff_round?: "quarterfinals" | "semifinals" | "final" | "third_place" | null
          playoff_position?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          home_team_id?: string
          away_team_id?: string
          home_score?: number | null
          away_score?: number | null
          match_date?: string
          match_time?: string | null
          field_number?: number | null
          round?: number | null
          status?: "scheduled" | "in_progress" | "finished" | "cancelled"
          phase?: "regular" | "playoffs"
          playoff_round?: "quarterfinals" | "semifinals" | "final" | "third_place" | null
          playoff_position?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      player_stats: {
        Row: {
          id: string
          player_id: string
          match_id: string
          goals: number
          assists: number
          yellow_cards: number
          red_cards: number
          minutes_played: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          player_id: string
          match_id: string
          goals?: number
          assists?: number
          yellow_cards?: number
          red_cards?: number
          minutes_played?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          match_id?: string
          goals?: number
          assists?: number
          yellow_cards?: number
          red_cards?: number
          minutes_played?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          role: "super_admin" | "league_admin" | "team_owner" | "public"
          league_id: string | null
          team_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          phone?: string | null
          role?: "super_admin" | "league_admin" | "team_owner" | "public"
          league_id?: string | null
          team_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          role?: "super_admin" | "league_admin" | "team_owner" | "public"
          league_id?: string | null
          team_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      match_referee_reports: {
        Row: {
          id: string
          match_id: string
          referee_name: string | null
          assistant_referee_1: string | null
          assistant_referee_2: string | null
          fourth_official: string | null
          general_observations: string | null
          weather_conditions: string | null
          field_conditions: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          match_id: string
          referee_name?: string | null
          assistant_referee_1?: string | null
          assistant_referee_2?: string | null
          fourth_official?: string | null
          general_observations?: string | null
          weather_conditions?: string | null
          field_conditions?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          referee_name?: string | null
          assistant_referee_1?: string | null
          assistant_referee_2?: string | null
          fourth_official?: string | null
          general_observations?: string | null
          weather_conditions?: string | null
          field_conditions?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_referee_reports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          }
        ]
      }
      match_goals: {
        Row: {
          id: string
          match_id: string
          player_id: string
          team_id: string
          minute: number
          goal_type: "normal" | "penalty" | "own_goal" | "free_kick"
          assist_player_id: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          player_id: string
          team_id: string
          minute: number
          goal_type?: "normal" | "penalty" | "own_goal" | "free_kick"
          assist_player_id?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          player_id?: string
          team_id?: string
          minute?: number
          goal_type?: "normal" | "penalty" | "own_goal" | "free_kick"
          assist_player_id?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_goals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_goals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_goals_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          }
        ]
      }
      match_cards: {
        Row: {
          id: string
          match_id: string
          player_id: string
          team_id: string
          card_type: "yellow" | "red"
          minute: number
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          player_id: string
          team_id: string
          card_type: "yellow" | "red"
          minute: number
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          player_id?: string
          team_id?: string
          card_type?: "yellow" | "red"
          minute?: number
          reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_cards_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_cards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_cards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      match_incidents: {
        Row: {
          id: string
          match_id: string
          minute: number | null
          incident_type: string
          description: string
          player_id: string | null
          team_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          minute?: number | null
          incident_type: string
          description: string
          player_id?: string | null
          team_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          minute?: number | null
          incident_type?: string
          description?: string
          player_id?: string | null
          team_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_incidents_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_incidents_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_incidents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      player_registration_requests: {
        Row: {
          id: string
          team_id: string
          tournament_id: string
          player_name: string
          player_position: string
          jersey_number: number
          birth_date: string | null
          reason: string
          status: "pending" | "approved" | "rejected"
          requested_by: string
          reviewed_by: string | null
          review_notes: string | null
          created_at: string
          updated_at: string
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          tournament_id: string
          player_name: string
          player_position: string
          jersey_number: number
          birth_date?: string | null
          reason: string
          status?: "pending" | "approved" | "rejected"
          requested_by: string
          reviewed_by?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          tournament_id?: string
          player_name?: string
          player_position?: string
          jersey_number?: number
          birth_date?: string | null
          reason?: string
          status?: "pending" | "approved" | "rejected"
          requested_by?: string
          reviewed_by?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
          reviewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_registration_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_registration_requests_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_registration_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_registration_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "super_admin" | "league_admin" | "team_owner" | "public"
      match_status: "scheduled" | "in_progress" | "finished" | "cancelled"
      card_type: "yellow" | "red"
      goal_type: "normal" | "penalty" | "own_goal" | "free_kick"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}