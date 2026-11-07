// Package teams manages team registration, team ownership, players, coaching staff,
// and player registration requests across tournaments.
package teams

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
)

// Team is the public representation of a row in public.teams.
type Team struct {
	ID                 uuid.UUID  `json:"id"`
	Name               string     `json:"name"`
	Slug               string     `json:"slug"`
	LeagueID           uuid.UUID  `json:"league_id"`
	TournamentID       *uuid.UUID `json:"tournament_id,omitempty"`
	OwnerID            uuid.UUID  `json:"owner_id"`
	Logo               *string    `json:"logo,omitempty"`
	Description        *string    `json:"description,omitempty"`
	IsActive           bool       `json:"is_active"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	HomePrimaryColor   *string    `json:"home_primary_color,omitempty"`
	HomeSecondaryColor *string    `json:"home_secondary_color,omitempty"`
	HomeAccentColor    *string    `json:"home_accent_color,omitempty"`
	AwayPrimaryColor   *string    `json:"away_primary_color,omitempty"`
	AwaySecondaryColor *string    `json:"away_secondary_color,omitempty"`
	AwayAccentColor    *string    `json:"away_accent_color,omitempty"`
	Alt1ShortsColor    *string    `json:"alt1_shorts_color,omitempty"`
	Alt2ShortsColor    *string    `json:"alt2_shorts_color,omitempty"`
	GroupName          *string    `json:"group_name,omitempty"`
}

// CreateTeamRequest is the payload for creating a team.
type CreateTeamRequest struct {
	Name         string     `json:"name"`
	Slug         string     `json:"slug"`
	LeagueID     uuid.UUID  `json:"league_id"`
	TournamentID *uuid.UUID `json:"tournament_id,omitempty"`
	Logo         *string    `json:"logo,omitempty"`
	Description  *string    `json:"description,omitempty"`
}

// Validate checks the request for errors.
func (r *CreateTeamRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Name == "" {
		errs["name"] = "requerido"
	}
	if r.Slug == "" {
		errs["slug"] = "requerido"
	}
	if r.LeagueID == uuid.Nil {
		errs["league_id"] = "requerido"
	}
	return errs
}

// UpdateTeamRequest is the payload for updating a team.
type UpdateTeamRequest struct {
	Name               *string `json:"name,omitempty"`
	Logo               *string `json:"logo,omitempty"`
	Description        *string `json:"description,omitempty"`
	GroupName          *string `json:"group_name,omitempty"`
	HomePrimaryColor   *string `json:"home_primary_color,omitempty"`
	HomeSecondaryColor *string `json:"home_secondary_color,omitempty"`
	HomeAccentColor    *string `json:"home_accent_color,omitempty"`
	AwayPrimaryColor   *string `json:"away_primary_color,omitempty"`
	AwaySecondaryColor *string `json:"away_secondary_color,omitempty"`
	AwayAccentColor    *string `json:"away_accent_color,omitempty"`
	Alt1ShortsColor    *string `json:"alt1_shorts_color,omitempty"`
	Alt2ShortsColor    *string `json:"alt2_shorts_color,omitempty"`
}

// Validate checks the request for errors.
func (r *UpdateTeamRequest) Validate() map[string]string {
	errs := make(map[string]string)
	// Validate group name if provided (must be single uppercase letter A-Z or null)
	if r.GroupName != nil && *r.GroupName != "" && len(*r.GroupName) != 1 {
		errs["group_name"] = "debe ser una letra mayúscula individual"
	}
	// Validate all color fields (hex color format #RRGGBB or null)
	colorFields := map[string]*string{
		"home_primary_color":   r.HomePrimaryColor,
		"home_secondary_color": r.HomeSecondaryColor,
		"home_accent_color":    r.HomeAccentColor,
		"away_primary_color":   r.AwayPrimaryColor,
		"away_secondary_color": r.AwaySecondaryColor,
		"away_accent_color":    r.AwayAccentColor,
		"alt1_shorts_color":    r.Alt1ShortsColor,
		"alt2_shorts_color":    r.Alt2ShortsColor,
	}
	for field, value := range colorFields {
		if value != nil && *value != "" && !isValidHexColor(*value) {
			errs[field] = "debe ser un color hex válido (#RRGGBB)"
		}
	}
	return errs
}

// isValidHexColor checks if a string is a valid hex color code.
func isValidHexColor(s string) bool {
	if len(s) != 7 {
		return false
	}
	if s[0] != '#' {
		return false
	}
	for i := 1; i < 7; i++ {
		c := s[i]
		if !((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f')) {
			return false
		}
	}
	return true
}

// Player is the internal representation of a row in public.players (includes PII).
// Never expose this in public endpoints.
type Player struct {
	ID                   uuid.UUID   `json:"id"`
	Name                 string      `json:"name"`
	TeamID               uuid.UUID   `json:"team_id"`
	Position             string      `json:"position"`
	JerseyNumber         int         `json:"jersey_number"`
	Photo                *string     `json:"photo,omitempty"`
	BirthDate            *httpx.Date `json:"birth_date,omitempty"`
	IsActive             bool        `json:"is_active"`
	CreatedAt            time.Time   `json:"created_at"`
	UpdatedAt            time.Time   `json:"updated_at"`
	EnrollmentStatus     *string     `json:"enrollment_status,omitempty"`
	IDVerified           bool        `json:"id_verified"`
	FaceEmbedding        interface{} `json:"-"` // Excluded: pgvector type
	FaceQualityScore     *float64    `json:"-"`
	IDDocumentURL        *string     `json:"-"`
	IDVerifiedBy         *uuid.UUID  `json:"-"`
	IDVerificationMethod *string     `json:"-"`
	ExtractedName        *string     `json:"-"`
	ExtractedCurp        *string     `json:"-"`
}

// PublicPlayer is the safe representation for anonymous/public endpoints.
// Excludes all PII: face_embedding, id_document_url, extracted_curp, extracted_name,
// id_verified*, enrollment_metadata, birth_date.
type PublicPlayer struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	TeamID       uuid.UUID `json:"team_id"`
	Position     string    `json:"position"`
	JerseyNumber int       `json:"jersey_number"`
	Photo        *string   `json:"photo,omitempty"`
	IsActive     bool      `json:"is_active"`
}

// CreatePlayerRequest is the payload for creating a player.
type CreatePlayerRequest struct {
	Name         string      `json:"name"`
	Position     string      `json:"position"`
	JerseyNumber int         `json:"jersey_number"`
	Photo        *string     `json:"photo,omitempty"`
	BirthDate    *httpx.Date `json:"birth_date,omitempty"`
}

// Validate checks the request for errors.
func (r *CreatePlayerRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Name == "" {
		errs["name"] = "requerido"
	}
	if r.Position == "" {
		errs["position"] = "requerido"
	}
	if r.JerseyNumber <= 0 || r.JerseyNumber > 99 {
		errs["jersey_number"] = "debe estar entre 1 y 99"
	}
	return errs
}

// UpdatePlayerRequest is the payload for updating a player.
type UpdatePlayerRequest struct {
	Name         *string     `json:"name,omitempty"`
	Position     *string     `json:"position,omitempty"`
	JerseyNumber *int        `json:"jersey_number,omitempty"`
	Photo        *string     `json:"photo,omitempty"`
	BirthDate    *httpx.Date `json:"birth_date,omitempty"`
}

// Validate checks the request for errors.
func (r *UpdatePlayerRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.JerseyNumber != nil && (*r.JerseyNumber <= 0 || *r.JerseyNumber > 99) {
		errs["jersey_number"] = "debe estar entre 1 y 99"
	}
	return errs
}

// CoachingStaff is the internal representation of a row in public.coaching_staff (includes PII).
// Never expose this in public endpoints.
type CoachingStaff struct {
	ID        uuid.UUID   `json:"id"`
	TeamID    uuid.UUID   `json:"team_id"`
	Name      string      `json:"name"`
	Role      string      `json:"role"`
	Photo     *string     `json:"photo,omitempty"`
	BirthDate *httpx.Date `json:"birth_date,omitempty"`
	Cedula    *string     `json:"cedula,omitempty"`
	IsActive  bool        `json:"is_active"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
}

// PublicCoachingStaff is the safe representation for anonymous/public endpoints.
// Excludes all PII: birth_date, cedula.
type PublicCoachingStaff struct {
	ID       uuid.UUID `json:"id"`
	TeamID   uuid.UUID `json:"team_id"`
	Name     string    `json:"name"`
	Role     string    `json:"role"`
	Photo    *string   `json:"photo,omitempty"`
	IsActive bool      `json:"is_active"`
}

// CreateCoachingStaffRequest is the payload for creating a coaching staff member.
type CreateCoachingStaffRequest struct {
	Name      string      `json:"name"`
	Role      string      `json:"role"`
	Photo     *string     `json:"photo,omitempty"`
	BirthDate *httpx.Date `json:"birth_date,omitempty"`
	Cedula    *string     `json:"cedula,omitempty"`
}

// Validate checks the request for errors.
func (r *CreateCoachingStaffRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Name == "" {
		errs["name"] = "requerido"
	}
	if r.Role == "" {
		errs["role"] = "requerido"
	}
	return errs
}

// UpdateCoachingStaffRequest is the payload for updating a coaching staff member.
type UpdateCoachingStaffRequest struct {
	Name      *string     `json:"name,omitempty"`
	Role      *string     `json:"role,omitempty"`
	Photo     *string     `json:"photo,omitempty"`
	BirthDate *httpx.Date `json:"birth_date,omitempty"`
	Cedula    *string     `json:"cedula,omitempty"`
}

// Validate checks the request for errors.
func (r *UpdateCoachingStaffRequest) Validate() map[string]string {
	return make(map[string]string) // No specific validations
}

// PlayerRegistrationRequest is the public representation of a row in public.player_registration_requests.
type PlayerRegistrationRequest struct {
	ID             uuid.UUID   `json:"id"`
	TeamID         uuid.UUID   `json:"team_id"`
	TournamentID   uuid.UUID   `json:"tournament_id"`
	PlayerName     string      `json:"player_name"`
	PlayerPosition string      `json:"player_position"`
	JerseyNumber   int         `json:"jersey_number"`
	BirthDate      *httpx.Date `json:"birth_date,omitempty"`
	Reason         string      `json:"reason"`
	Status         string      `json:"status"`
	RequestedBy    uuid.UUID   `json:"requested_by"`
	ReviewedBy     *uuid.UUID  `json:"reviewed_by,omitempty"`
	ReviewNotes    *string     `json:"review_notes,omitempty"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
	ReviewedAt     *time.Time  `json:"reviewed_at,omitempty"`
}

// CreatePlayerRegistrationRequestRequest is the payload for requesting player registration.
type CreatePlayerRegistrationRequestRequest struct {
	PlayerName     string      `json:"player_name"`
	PlayerPosition string      `json:"player_position"`
	JerseyNumber   int         `json:"jersey_number"`
	BirthDate      *httpx.Date `json:"birth_date,omitempty"`
	Reason         string      `json:"reason"`
}

// Validate checks the request for errors.
func (r *CreatePlayerRegistrationRequestRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.PlayerName == "" {
		errs["player_name"] = "requerido"
	}
	if r.PlayerPosition == "" {
		errs["player_position"] = "requerido"
	}
	if r.JerseyNumber <= 0 || r.JerseyNumber > 99 {
		errs["jersey_number"] = "debe estar entre 1 y 99"
	}
	if r.Reason == "" {
		errs["reason"] = "requerido"
	}
	return errs
}

// ReviewPlayerRegistrationRequestRequest is the payload for reviewing a registration request.
type ReviewPlayerRegistrationRequestRequest struct {
	Status      string  `json:"status"`
	ReviewNotes *string `json:"review_notes,omitempty"`
}

// Validate checks the request for errors.
func (r *ReviewPlayerRegistrationRequestRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Status != "approved" && r.Status != "rejected" {
		errs["status"] = "debe ser 'approved' o 'rejected'"
	}
	return errs
}

// QRBatchUpdateRequest is the payload for batch QR updates.
type QRBatchUpdateRequest struct {
	Players []struct {
		ID uuid.UUID `json:"id"`
	} `json:"players"`
}

// Validate checks the request for errors.
func (r *QRBatchUpdateRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if len(r.Players) == 0 {
		errs["players"] = "requerido al menos un jugador"
	} else if len(r.Players) > 200 {
		errs["players"] = "máximo 200 jugadores permitidos"
	}
	return errs
}

// Tournament holds tournament info needed for age validation and player limits.
type Tournament struct {
	ID                   uuid.UUID  `json:"id"`
	LeagueID             uuid.UUID  `json:"league_id"`
	RegistrationOpen     bool       `json:"registration_open"`
	MaxPlayers           *int       `json:"max_players,omitempty"`
	MaxCoachingStaff     int        `json:"max_coaching_staff"`
	AgeValidationEnabled bool       `json:"age_validation_enabled"`
	MinAge               *int       `json:"min_age,omitempty"`
	MaxAge               *int       `json:"max_age,omitempty"`
	AgeReferenceDate     *time.Time `json:"age_reference_date,omitempty"`
	AgeExceptionCount    int        `json:"age_exception_count"`
	AgeExceptionMinAge   *int       `json:"age_exception_min_age,omitempty"`
	AgeExceptionMaxAge   *int       `json:"age_exception_max_age,omitempty"`
}

// Repository is the persistence contract the service depends on.
type Repository interface {
	verificationRepository

	// Teams
	GetTeamByID(ctx context.Context, teamID uuid.UUID) (Team, error)
	GetTeamsByLeague(ctx context.Context, leagueID uuid.UUID, limit, offset int) ([]Team, error)
	GetTeamsByOwner(ctx context.Context, ownerID uuid.UUID, limit, offset int) ([]Team, error)
	CreateTeam(ctx context.Context, team Team) (Team, error)
	UpdateTeam(ctx context.Context, teamID uuid.UUID, req UpdateTeamRequest) (Team, error)
	ActivateTeam(ctx context.Context, teamID uuid.UUID) (Team, error)
	DeactivateTeam(ctx context.Context, teamID uuid.UUID) (Team, error)

	// Players
	GetPlayerByID(ctx context.Context, playerID uuid.UUID) (Player, error)
	GetPlayersByTeam(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]Player, error)
	CreatePlayer(ctx context.Context, player Player) (Player, error)
	CreatePlayerTx(ctx context.Context, q database.Querier, player Player) (Player, error)
	UpdatePlayer(ctx context.Context, playerID uuid.UUID, req UpdatePlayerRequest) (Player, error)
	DeactivatePlayer(ctx context.Context, playerID uuid.UUID) (Player, error)

	// Coaching Staff
	GetCoachingStaffByID(ctx context.Context, staffID uuid.UUID) (CoachingStaff, error)
	GetCoachingStaffByTeam(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]CoachingStaff, error)
	CreateCoachingStaff(ctx context.Context, staff CoachingStaff) (CoachingStaff, error)
	UpdateCoachingStaff(ctx context.Context, staffID uuid.UUID, req UpdateCoachingStaffRequest) (CoachingStaff, error)
	DeactivateCoachingStaff(ctx context.Context, staffID uuid.UUID) (CoachingStaff, error)

	// Player Registration Requests
	GetPlayerRegistrationRequestByID(ctx context.Context, reqID uuid.UUID) (PlayerRegistrationRequest, error)
	GetPlayerRegistrationRequestsByTeam(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]PlayerRegistrationRequest, error)
	GetPlayerRegistrationRequestsByTournament(ctx context.Context, tournamentID uuid.UUID, status string, limit, offset int) ([]PlayerRegistrationRequest, error)
	CreatePlayerRegistrationRequest(ctx context.Context, req PlayerRegistrationRequest) (PlayerRegistrationRequest, error)
	ReviewPlayerRegistrationRequest(ctx context.Context, reqID uuid.UUID, status string, reviewedBy uuid.UUID, notes *string) (PlayerRegistrationRequest, error)
	ReviewPlayerRegistrationRequestTx(ctx context.Context, q database.Querier, reqID uuid.UUID, status string, reviewedBy uuid.UUID, notes *string) (PlayerRegistrationRequest, error)

	// Query helpers
	CountPlayersByTeam(ctx context.Context, teamID uuid.UUID) (int, error)
	CountCoachingStaffByTeam(ctx context.Context, teamID uuid.UUID) (int, error)

	// Tournament
	GetTournamentByID(ctx context.Context, tournamentID uuid.UUID) (Tournament, error)

	// Pending requests and age validation
	CountPendingPlayerRegistrationsByTeamTournament(ctx context.Context, teamID, tournamentID uuid.UUID) (int, error)
	CountPlayersByTeamTournament(ctx context.Context, teamID, tournamentID uuid.UUID) (int, error)
	CountExceptionPlayersByTeamTournament(ctx context.Context, teamID, tournamentID uuid.UUID) (int, error)

	// Batch QR operations
	GetPlayersByLeague(ctx context.Context, leagueID uuid.UUID, limit int) ([]Player, error)
}
