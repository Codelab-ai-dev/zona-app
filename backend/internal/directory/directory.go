// Package directory provides user listings, search, and WhatsApp link management for league admins.
package directory

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// User is the public representation of a row in public.users (never auth.users).
type User struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	Email     string     `json:"email"`
	Phone     *string    `json:"phone,omitempty"`
	Role      string     `json:"role"`
	LeagueID  *uuid.UUID `json:"league_id,omitempty"`
	TeamID    *uuid.UUID `json:"team_id,omitempty"`
	IsActive  bool       `json:"is_active"`
	CreatedAt time.Time  `json:"created_at"`
}

// WhatsAppLink is a phone number linked to a user for WhatsApp notifications.
type WhatsAppLink struct {
	ID                uuid.UUID  `json:"id"`
	PhoneNumber       string     `json:"phone_number"`
	UserID            *uuid.UUID `json:"user_id,omitempty"`
	LeagueID          uuid.UUID  `json:"league_id"`
	TournamentID      *uuid.UUID `json:"tournament_id,omitempty"`
	Role              string     `json:"role"`
	IsActive          bool       `json:"is_active"`
	LinkedAt          time.Time  `json:"linked_at"`
	LastInteractionAt *time.Time `json:"last_interaction_at,omitempty"`
	DisplayName       *string    `json:"display_name,omitempty"`
	PreferredLanguage string     `json:"preferred_language"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// ListUsersRequest is the payload to list users.
type ListUsersRequest struct {
	Role   *string `json:"role,omitempty"`   // filter by role
	League *string `json:"league,omitempty"` // filter by league_id
	Search string  `json:"search,omitempty"` // search by name/email
	Limit  int     `json:"limit"`
	Offset int     `json:"offset"`
}

// Validate checks the request for errors.
func (r *ListUsersRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.Limit < 1 || r.Limit > 100 {
		errs["limit"] = "debe estar entre 1 y 100"
	}
	if r.Offset < 0 {
		errs["offset"] = "debe ser >= 0"
	}
	return errs
}

// CreateWhatsAppLinkRequest is the payload to create a WhatsApp link.
type CreateWhatsAppLinkRequest struct {
	PhoneNumber       string     `json:"phone_number"`
	UserID            *uuid.UUID `json:"user_id,omitempty"`
	Role              string     `json:"role"`
	DisplayName       *string    `json:"display_name,omitempty"`
	PreferredLanguage string     `json:"preferred_language"`
	// TournamentID scopes the assistant's answers; it must belong to the league.
	TournamentID *uuid.UUID `json:"tournament_id,omitempty"`
}

// Validate checks the request for errors.
func (r *CreateWhatsAppLinkRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if !isValidPhoneNumber(r.PhoneNumber) {
		errs["phone_number"] = "formato E.164 inválido (10-15 dígitos)"
	}
	if r.Role != "super_admin" && r.Role != "league_admin" && r.Role != "team_owner" && r.Role != "user" {
		errs["role"] = "debe ser 'super_admin', 'league_admin', 'team_owner' o 'user'"
	}
	if r.PreferredLanguage == "" {
		r.PreferredLanguage = "es"
	}
	return errs
}

// UpdateWhatsAppLinkRequest is the payload to update a WhatsApp link.
type UpdateWhatsAppLinkRequest struct {
	PhoneNumber       *string `json:"phone_number,omitempty"`
	IsActive          *bool   `json:"is_active,omitempty"`
	DisplayName       *string `json:"display_name,omitempty"`
	PreferredLanguage *string `json:"preferred_language,omitempty"`
	// TournamentID sets the tournament; the nil UUID clears it.
	TournamentID *uuid.UUID `json:"tournament_id,omitempty"`
}

// Validate checks the request for errors.
func (r *UpdateWhatsAppLinkRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.PhoneNumber != nil && !isValidPhoneNumber(*r.PhoneNumber) {
		errs["phone_number"] = "formato E.164 inválido (10-15 dígitos)"
	}
	return errs
}

// Repository is the persistence contract the service depends on.
type Repository interface {
	// ListUsers returns all users, optionally filtered by role/league/search term.
	ListUsers(ctx context.Context, role *string, leagueID *uuid.UUID, search string, limit, offset int) ([]User, error)

	// ListLeagueUsers returns users that belong to a league.
	ListLeagueUsers(ctx context.Context, leagueID uuid.UUID, search string, limit, offset int) ([]User, error)

	// ListWhatsAppLinks returns all WhatsApp links for a league.
	ListWhatsAppLinks(ctx context.Context, leagueID uuid.UUID, limit, offset int) ([]WhatsAppLink, error)

	// CreateWhatsAppLink inserts a new WhatsApp link.
	CreateWhatsAppLink(ctx context.Context, leagueID uuid.UUID, req *CreateWhatsAppLinkRequest) (WhatsAppLink, error)

	// GetWhatsAppLink fetches a single WhatsApp link.
	GetWhatsAppLink(ctx context.Context, linkID uuid.UUID) (WhatsAppLink, error)

	// UpdateWhatsAppLink updates a WhatsApp link.
	UpdateWhatsAppLink(ctx context.Context, linkID uuid.UUID, req *UpdateWhatsAppLinkRequest) (WhatsAppLink, error)

	// DeactivateWhatsAppLink sets a link inactive.
	DeactivateWhatsAppLink(ctx context.Context, linkID uuid.UUID) (WhatsAppLink, error)

	// PhoneNumberExists checks if a phone number is already registered in whatsapp_user_links.
	PhoneNumberExists(ctx context.Context, phoneNumber string) (bool, error)

	// GetLeagueID fetches the league admin for authorization checks.
	GetLeagueID(ctx context.Context, linkID uuid.UUID) (uuid.UUID, error)
}

// isValidPhoneNumber checks if a phone number is roughly E.164-compliant.
// E.164 format is 1-15 digits (no +, -, spaces, etc.).
func isValidPhoneNumber(phone string) bool {
	if len(phone) < 10 || len(phone) > 15 {
		return false
	}
	for _, c := range phone {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

// errTournamentNotInLeague is returned when a link's tournament belongs to another league.
var errTournamentNotInLeague = httpx.Validation(map[string]string{"tournament_id": "el torneo no pertenece a la liga"})
