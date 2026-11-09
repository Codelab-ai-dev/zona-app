// Package stats provides standings, player stats, team stats, top scorers,
// discipline and suspensions management for tournaments.
package stats

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Standings represents a team's position in a tournament.
type Standings struct {
	Position         int        `json:"position"`
	TeamID           uuid.UUID  `json:"team_id"`
	TeamName         string     `json:"team_name"`
	TeamLogo         *string    `json:"team_logo,omitempty"`
	MatchesPlayed    int        `json:"matches_played"`
	MatchesWon       int        `json:"matches_won"`
	MatchesDrawn     int        `json:"matches_drawn"`
	MatchesLost      int        `json:"matches_lost"`
	GoalsFor         int        `json:"goals_for"`
	GoalsAgainst     int        `json:"goals_against"`
	GoalDifference   int        `json:"goal_difference"`
	Points           int        `json:"points"`
	PointsAdjustment int        `json:"points_adjustment"`
	AdjustmentReason *string    `json:"adjustment_reason,omitempty"`
	RecentForm       *string    `json:"recent_form,omitempty"`
	LastMatchDate    *time.Time `json:"last_match_date,omitempty"`
}

// TeamStats represents aggregated team statistics.
type TeamStats struct {
	ID               uuid.UUID  `json:"id"`
	TeamID           uuid.UUID  `json:"team_id"`
	TournamentID     uuid.UUID  `json:"tournament_id"`
	LeagueID         uuid.UUID  `json:"league_id"`
	MatchesPlayed    int        `json:"matches_played"`
	MatchesWon       int        `json:"matches_won"`
	MatchesDrawn     int        `json:"matches_drawn"`
	MatchesLost      int        `json:"matches_lost"`
	GoalsFor         int        `json:"goals_for"`
	GoalsAgainst     int        `json:"goals_against"`
	GoalDifference   int        `json:"goal_difference"`
	Points           int        `json:"points"`
	CleanSheets      int        `json:"clean_sheets"`
	YellowCards      int        `json:"yellow_cards"`
	RedCards         int        `json:"red_cards"`
	PointsAdjustment int        `json:"points_adjustment"`
	AdjustmentReason *string    `json:"adjustment_reason,omitempty"`
	RecentForm       *string    `json:"recent_form,omitempty"`
	LastMatchDate    *time.Time `json:"last_match_date,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// PlayerStats represents a player's aggregated statistics.
type PlayerStats struct {
	ID            uuid.UUID `json:"id"`
	PlayerID      uuid.UUID `json:"player_id"`
	PlayerName    string    `json:"player_name"`
	JerseyNumber  int       `json:"jersey_number"`
	Position      *string   `json:"position,omitempty"`
	Photo         *string   `json:"photo,omitempty"`
	TeamID        uuid.UUID `json:"team_id"`
	TeamName      string    `json:"team_name"`
	MatchesPlayed int64     `json:"matches_played"`
	Goals         int64     `json:"goals"`
	Assists       int64     `json:"assists"`
	YellowCards   int64     `json:"yellow_cards"`
	RedCards      int64     `json:"red_cards"`
	MinutesPlayed int64     `json:"minutes_played"`
}

// TopScorersRow represents a row in top scorers ranking.
type TopScorersRow = PlayerStats

// DisciplineRow represents a row in discipline ranking.
type DisciplineRow = PlayerStats

// Suspension represents a player suspension.
type Suspension struct {
	ID             uuid.UUID  `json:"id"`
	PlayerID       uuid.UUID  `json:"player_id"`
	TeamID         uuid.UUID  `json:"team_id"`
	LeagueID       uuid.UUID  `json:"league_id"`
	TournamentID   *uuid.UUID `json:"tournament_id,omitempty"`
	SuspensionType string     `json:"suspension_type"`
	Reason         string     `json:"reason"`
	MatchesToServe int        `json:"matches_to_serve"`
	MatchesServed  int        `json:"matches_served"`
	Status         string     `json:"status"`
	Notes          *string    `json:"notes,omitempty"`
	StartDate      time.Time  `json:"start_date"`
	EndDate        *time.Time `json:"end_date,omitempty"`
	CreatedBy      *uuid.UUID `json:"created_by,omitempty"`
	UpdatedBy      *uuid.UUID `json:"updated_by,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// CreateSuspensionRequest is the payload to create a new suspension.
type CreateSuspensionRequest struct {
	PlayerID       uuid.UUID `json:"player_id"`
	TeamID         uuid.UUID `json:"team_id"`
	SuspensionType string    `json:"suspension_type"`
	Reason         string    `json:"reason"`
	MatchesToServe int       `json:"matches_to_serve"`
	Notes          *string   `json:"notes,omitempty"`
}

// Validate checks the request for errors.
func (r *CreateSuspensionRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.PlayerID == uuid.Nil {
		errs["player_id"] = "requerido"
	}
	if r.TeamID == uuid.Nil {
		errs["team_id"] = "requerido"
	}
	if r.SuspensionType == "" {
		errs["suspension_type"] = "requerido"
	} else if !validSuspensionType(r.SuspensionType) {
		errs["suspension_type"] = "inválido: red_card, yellow_accumulation, disciplinary_committee, other"
	}
	if r.Reason == "" {
		errs["reason"] = "requerido"
	}
	if r.MatchesToServe < 1 {
		errs["matches_to_serve"] = "debe ser al menos 1"
	}
	return errs
}

// UpdateSuspensionRequest is the payload to update a suspension.
type UpdateSuspensionRequest struct {
	MatchesToServe *int    `json:"matches_to_serve,omitempty"`
	Notes          *string `json:"notes,omitempty"`
	// Status is intentionally absent: it changes only through the
	// cancel/complete endpoints so transitions stay auditable.
}

// Validate checks the request for errors.
func (r *UpdateSuspensionRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.MatchesToServe != nil && *r.MatchesToServe < 1 {
		errs["matches_to_serve"] = "debe ser al menos 1"
	}
	return errs
}

// PointsAdjustmentRequest is the payload to adjust team points.
type PointsAdjustmentRequest struct {
	TeamID           uuid.UUID `json:"team_id"`
	TournamentID     uuid.UUID `json:"tournament_id"`
	PointsAdjustment int       `json:"points_adjustment"`
	AdjustmentReason string    `json:"adjustment_reason"`
}

// Validate checks the request for errors.
func (r *PointsAdjustmentRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.TeamID == uuid.Nil {
		errs["team_id"] = "requerido"
	}
	if r.TournamentID == uuid.Nil {
		errs["tournament_id"] = "requerido"
	}
	// A reason is required to apply an adjustment, not to remove it (0).
	if r.AdjustmentReason == "" && r.PointsAdjustment != 0 {
		errs["adjustment_reason"] = "requerido"
	}
	return errs
}

// PlayerTeamLeague is used internally to verify player ownership (IDOR prevention).
type PlayerTeamLeague struct {
	PlayerID uuid.UUID
	TeamID   uuid.UUID
	LeagueID uuid.UUID
}

// MatchWithTeams is used to verify suspension team belongs to match.
type MatchWithTeams struct {
	MatchID    uuid.UUID
	HomeTeamID uuid.UUID
	AwayTeamID uuid.UUID
}

// Repository is the persistence contract the service depends on.
// Scope identifies what a public read is about, to check its league is active.
type Scope string

const (
	ScopeTournament Scope = "tournament"
	ScopeTeam       Scope = "team"
	ScopePlayer     Scope = "player"
)

type Repository interface {
	// IsPubliclyVisible reports whether the league owning the resource is active.
	IsPubliclyVisible(ctx context.Context, scope Scope, id uuid.UUID) (bool, error)

	// Standings
	GetStandingsByTournament(ctx context.Context, tournamentID uuid.UUID, limit int) ([]Standings, error)

	// Team Stats
	GetTeamStats(ctx context.Context, teamID uuid.UUID, tournamentID *uuid.UUID) (TeamStats, error)
	UpdateTeamPointsAdjustment(ctx context.Context, teamID uuid.UUID, tournamentID uuid.UUID, adjustment int, reason string) error

	// Player Stats
	GetPlayerStats(ctx context.Context, playerID uuid.UUID) (PlayerStats, error)
	GetTopScorersByTournament(ctx context.Context, tournamentID uuid.UUID, limit int) ([]TopScorersRow, error)
	GetDisciplineByTournament(ctx context.Context, tournamentID uuid.UUID, limit int) ([]DisciplineRow, error)
	GetPlayerStatsByTeam(ctx context.Context, teamID uuid.UUID, tournamentID *uuid.UUID) ([]PlayerStats, error)

	// Suspensions
	GetSuspensionByID(ctx context.Context, suspensionID uuid.UUID) (Suspension, error)
	GetSuspensionsByLeague(ctx context.Context, leagueID uuid.UUID) ([]Suspension, error)
	GetSuspensionsByTeam(ctx context.Context, teamID uuid.UUID) ([]Suspension, error)
	CreateSuspension(ctx context.Context, leagueID uuid.UUID, req *CreateSuspensionRequest) (Suspension, error)
	UpdateSuspension(ctx context.Context, suspensionID uuid.UUID, req *UpdateSuspensionRequest) (Suspension, error)
	CancelSuspension(ctx context.Context, suspensionID uuid.UUID) (Suspension, error)
	CompleteSuspension(ctx context.Context, suspensionID uuid.UUID) (Suspension, error)
	ApplySuspensionToMatch(ctx context.Context, suspensionID uuid.UUID, matchID uuid.UUID) error

	// Authorization helpers
	GetPlayerTeamLeague(ctx context.Context, playerID uuid.UUID) (PlayerTeamLeague, error)
	GetMatchWithTeams(ctx context.Context, matchID uuid.UUID) (MatchWithTeams, error)
}

// validSuspensionType checks if the type matches the DB enum.
func validSuspensionType(t string) bool {
	switch t {
	case "red_card", "yellow_accumulation", "disciplinary_committee", "other":
		return true
	}
	return false
}

// validSuspensionStatus checks if the status matches the DB enum.
func validSuspensionStatus(s string) bool {
	switch s {
	case "active", "completed", "cancelled":
		return true
	}
	return false
}
