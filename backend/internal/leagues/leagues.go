// Package leagues manages football league, tournament, and league feature data.
package leagues

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// League is the public representation of a row in public.leagues.
type League struct {
	ID            uuid.UUID       `json:"id"`
	Name          string          `json:"name"`
	Slug          string          `json:"slug"`
	Description   string          `json:"description"`
	Logo          *string         `json:"logo,omitempty"`
	AdminID       uuid.UUID       `json:"admin_id"`
	IsActive      bool            `json:"is_active"`
	ProductMode   string          `json:"product_mode"`
	Features      json.RawMessage `json:"features,omitempty"`
	ModeUpdatedAt *time.Time      `json:"mode_updated_at,omitempty"`
	ModeUpdatedBy *uuid.UUID      `json:"mode_updated_by,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// CreateLeagueRequest is the payload for POST /leagues.
type CreateLeagueRequest struct {
	Name        string     `json:"name"`
	Slug        string     `json:"slug"`
	Description string     `json:"description"`
	Logo        *string    `json:"logo,omitempty"`
	AdminID     *uuid.UUID `json:"admin_id,omitempty"` // Super admin only; nil means current user
}

// Validate checks the request for errors.
func (r *CreateLeagueRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Name == "" {
		errs["name"] = "requerido"
	}
	if r.Slug == "" {
		errs["slug"] = "requerido"
	}
	if r.Description == "" {
		errs["description"] = "requerido"
	}
	return errs
}

// UpdateLeagueRequest is the payload for PATCH /leagues/{id}.
type UpdateLeagueRequest struct {
	Name        *string `json:"name,omitempty"`
	Slug        *string `json:"slug,omitempty"`
	Description *string `json:"description,omitempty"`
	Logo        *string `json:"logo,omitempty"`
}

// Validate checks the request for errors.
func (r *UpdateLeagueRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Name != nil && *r.Name == "" {
		errs["name"] = "no puede estar vacío"
	}
	if r.Slug != nil && *r.Slug == "" {
		errs["slug"] = "no puede estar vacío"
	}
	if r.Description != nil && *r.Description == "" {
		errs["description"] = "no puede estar vacío"
	}
	return errs
}

// UpdateProductModeRequest is the payload for PATCH /leagues/{id}/product-mode (super admin only).
type UpdateProductModeRequest struct {
	ProductMode string          `json:"product_mode"`
	Features    json.RawMessage `json:"features,omitempty"`
}

// Validate checks the request for errors.
func (r *UpdateProductModeRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.ProductMode != "full" && r.ProductMode != "web_only" {
		errs["product_mode"] = "debe ser 'full' o 'web_only'"
	}
	return errs
}

// SetLeagueStatusRequest is the payload for PATCH /leagues/{id}/activate and /deactivate.
type SetLeagueStatusRequest struct {
	IsActive bool `json:"is_active"`
}

// Tournament is the public representation of a row in public.tournaments.
type Tournament struct {
	ID                     uuid.UUID `json:"id"`
	Name                   string    `json:"name"`
	LeagueID               uuid.UUID `json:"league_id"`
	StartDate              string    `json:"start_date"`
	EndDate                string    `json:"end_date"`
	IsActive               bool      `json:"is_active"`
	MaxPlayers             *int      `json:"max_players,omitempty"`
	RegistrationOpen       bool      `json:"registration_open"`
	MaxCoachingStaff       *int      `json:"max_coaching_staff,omitempty"`
	TournamentFormat       string    `json:"tournament_format"`
	NumberOfGroups         *int      `json:"number_of_groups,omitempty"`
	TeamsAdvancingPerGroup *int      `json:"teams_advancing_per_group,omitempty"`
	RoundsPerSeason        int       `json:"rounds_per_season"`
	HasThirdPlaceMatch     bool      `json:"has_third_place_match"`
	AgeValidationEnabled   bool      `json:"age_validation_enabled"`
	MinAge                 *int      `json:"min_age,omitempty"`
	MaxAge                 *int      `json:"max_age,omitempty"`
	AgeReferenceDate       *string   `json:"age_reference_date,omitempty"`
	AgeExceptionCount      *int      `json:"age_exception_count,omitempty"`
	AgeExceptionMinAge     *int      `json:"age_exception_min_age,omitempty"`
	AgeExceptionMaxAge     *int      `json:"age_exception_max_age,omitempty"`
	IDDocumentRequired     bool      `json:"id_document_required"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}

// CreateTournamentRequest is the payload for POST /tournaments.
type CreateTournamentRequest struct {
	LeagueID               uuid.UUID `json:"league_id"`
	Name                   string    `json:"name"`
	StartDate              string    `json:"start_date"`
	EndDate                string    `json:"end_date"`
	IsActive               *bool     `json:"is_active,omitempty"`
	MaxPlayers             *int      `json:"max_players,omitempty"`
	RegistrationOpen       *bool     `json:"registration_open,omitempty"`
	MaxCoachingStaff       *int      `json:"max_coaching_staff,omitempty"`
	TournamentFormat       string    `json:"tournament_format"`
	NumberOfGroups         *int      `json:"number_of_groups,omitempty"`
	TeamsAdvancingPerGroup *int      `json:"teams_advancing_per_group,omitempty"`
	RoundsPerSeason        *int      `json:"rounds_per_season,omitempty"`
	HasThirdPlaceMatch     *bool     `json:"has_third_place_match,omitempty"`
	AgeValidationEnabled   *bool     `json:"age_validation_enabled,omitempty"`
	MinAge                 *int      `json:"min_age,omitempty"`
	MaxAge                 *int      `json:"max_age,omitempty"`
	AgeReferenceDate       *string   `json:"age_reference_date,omitempty"`
	AgeExceptionCount      *int      `json:"age_exception_count,omitempty"`
	AgeExceptionMinAge     *int      `json:"age_exception_min_age,omitempty"`
	AgeExceptionMaxAge     *int      `json:"age_exception_max_age,omitempty"`
	IDDocumentRequired     *bool     `json:"id_document_required,omitempty"`
}

// Validate checks the request for errors.
func (r *CreateTournamentRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.LeagueID == uuid.Nil {
		errs["league_id"] = "requerido"
	}
	if r.Name == "" {
		errs["name"] = "requerido"
	}
	if r.StartDate == "" {
		errs["start_date"] = "requerido"
	}
	if r.EndDate == "" {
		errs["end_date"] = "requerido"
	}
	if r.TournamentFormat != "league" && r.TournamentFormat != "knockout" && r.TournamentFormat != "group_knockout" {
		errs["tournament_format"] = "debe ser 'league', 'knockout' o 'group_knockout'"
	}
	if r.NumberOfGroups != nil && (*r.NumberOfGroups < 2 || *r.NumberOfGroups > 8) {
		errs["number_of_groups"] = "debe estar entre 2 y 8"
	}
	if r.TeamsAdvancingPerGroup != nil && (*r.TeamsAdvancingPerGroup < 1 || *r.TeamsAdvancingPerGroup > 4) {
		errs["teams_advancing_per_group"] = "debe estar entre 1 y 4"
	}
	if r.RoundsPerSeason != nil && (*r.RoundsPerSeason < 1 || *r.RoundsPerSeason > 4) {
		errs["rounds_per_season"] = "debe estar entre 1 y 4"
	}
	return errs
}

// UpdateTournamentRequest is the payload for PATCH /tournaments/{id}.
type UpdateTournamentRequest struct {
	Name                   *string `json:"name,omitempty"`
	StartDate              *string `json:"start_date,omitempty"`
	EndDate                *string `json:"end_date,omitempty"`
	IsActive               *bool   `json:"is_active,omitempty"`
	MaxPlayers             *int    `json:"max_players,omitempty"`
	RegistrationOpen       *bool   `json:"registration_open,omitempty"`
	MaxCoachingStaff       *int    `json:"max_coaching_staff,omitempty"`
	TournamentFormat       *string `json:"tournament_format,omitempty"`
	NumberOfGroups         *int    `json:"number_of_groups,omitempty"`
	TeamsAdvancingPerGroup *int    `json:"teams_advancing_per_group,omitempty"`
	RoundsPerSeason        *int    `json:"rounds_per_season,omitempty"`
	HasThirdPlaceMatch     *bool   `json:"has_third_place_match,omitempty"`
	AgeValidationEnabled   *bool   `json:"age_validation_enabled,omitempty"`
	MinAge                 *int    `json:"min_age,omitempty"`
	MaxAge                 *int    `json:"max_age,omitempty"`
	AgeReferenceDate       *string `json:"age_reference_date,omitempty"`
	AgeExceptionCount      *int    `json:"age_exception_count,omitempty"`
	AgeExceptionMinAge     *int    `json:"age_exception_min_age,omitempty"`
	AgeExceptionMaxAge     *int    `json:"age_exception_max_age,omitempty"`
	IDDocumentRequired     *bool   `json:"id_document_required,omitempty"`
}

// Validate checks the request for errors.
func (r *UpdateTournamentRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.TournamentFormat != nil && *r.TournamentFormat != "league" && *r.TournamentFormat != "knockout" && *r.TournamentFormat != "group_knockout" {
		errs["tournament_format"] = "debe ser 'league', 'knockout' o 'group_knockout'"
	}
	if r.NumberOfGroups != nil && (*r.NumberOfGroups < 2 || *r.NumberOfGroups > 8) {
		errs["number_of_groups"] = "debe estar entre 2 y 8"
	}
	if r.TeamsAdvancingPerGroup != nil && (*r.TeamsAdvancingPerGroup < 1 || *r.TeamsAdvancingPerGroup > 4) {
		errs["teams_advancing_per_group"] = "debe estar entre 1 y 4"
	}
	if r.RoundsPerSeason != nil && (*r.RoundsPerSeason < 1 || *r.RoundsPerSeason > 4) {
		errs["rounds_per_season"] = "debe estar entre 1 y 4"
	}
	return errs
}

// ListResponse is the paginated response for list endpoints.
type ListResponse struct {
	Total int `json:"total"`
	Limit int `json:"limit"`
}

// LeaguesListResponse is the response for GET /leagues.
type LeaguesListResponse struct {
	ListResponse
	Data []League `json:"data"`
}

// TournamentsListResponse is the response for GET /tournaments.
type TournamentsListResponse struct {
	ListResponse
	Data []Tournament `json:"data"`
}

// Repository defines the persistence contract for leagues and tournaments.
type Repository interface {
	// Leagues
	GetLeagueByID(ctx context.Context, id uuid.UUID) (League, error)
	GetLeagueBySlug(ctx context.Context, slug string) (League, error)
	ListActiveLeagues(ctx context.Context, limit int, offset int) ([]League, int, error)
	ListAllLeagues(ctx context.Context, limit int, offset int) ([]League, int, error)
	CreateLeague(ctx context.Context, l *League) (uuid.UUID, error)
	UpdateLeague(ctx context.Context, l *League) error
	UpdateLeagueProductMode(ctx context.Context, leagueID uuid.UUID, productMode string, features json.RawMessage, updatedBy uuid.UUID) error

	// Tournaments
	GetTournamentByID(ctx context.Context, id uuid.UUID) (Tournament, error)
	ListTournamentsByLeague(ctx context.Context, leagueID uuid.UUID, limit int, offset int) ([]Tournament, int, error)
	CreateTournament(ctx context.Context, t *Tournament) (uuid.UUID, error)
	UpdateTournament(ctx context.Context, t *Tournament) error
}
