// Package notifications sends WhatsApp template messages to league/tournament users.
package notifications

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Recipient is a phone number to notify.
type Recipient struct {
	PhoneNumber string
}

// Summary is the result of a send operation.
type Summary struct {
	Sent    int `json:"sent"`
	Failed  int `json:"failed"`
	Skipped int `json:"skipped"`
}

// TemplateComponent represents a WhatsApp message component.
type TemplateComponent struct {
	Type       string              `json:"type"` // "body", "header", "button"
	SubType    string              `json:"sub_type,omitempty"`
	Index      *int                `json:"index,omitempty"`
	Parameters []TemplateParameter `json:"parameters"`
}

// TemplateParameter is a single template variable.
type TemplateParameter struct {
	Type string `json:"type"` // "text"
	Text string `json:"text"`
}

// TemplatePayload is the complete payload to send to Kapso.
type TemplatePayload struct {
	TemplateName string              `json:"template_name"`
	Language     string              `json:"language"`
	Components   []TemplateComponent `json:"components"`
}

// Repository fetches recipients and league/match data.
type Repository interface {
	// GetLeagueRecipients returns all active WhatsApp phone numbers linked to a league.
	GetLeagueRecipients(ctx context.Context, leagueID uuid.UUID) ([]Recipient, error)

	// GetMatchRecipients returns all active WhatsApp phone numbers linked to teams in a match.
	GetMatchRecipients(ctx context.Context, matchID uuid.UUID) ([]Recipient, error)

	// GetLeagueSlug fetches a league's slug for URL construction.
	GetLeagueSlug(ctx context.Context, leagueID uuid.UUID) (string, error)

	// GetLeagueData fetches league and tournament data for jornada notification.
	GetLeagueData(ctx context.Context, leagueID uuid.UUID, tournamentID uuid.UUID, round int) (LeagueData, error)

	// GetMatchData fetches match details for result notification.
	GetMatchData(ctx context.Context, matchID uuid.UUID) (MatchData, error)

	// GetMatchLeague fetches the league_id for a match.
	GetMatchLeague(ctx context.Context, matchID uuid.UUID) (uuid.UUID, error)

	// PhoneNumberExists checks if a phone number is registered in whatsapp_user_links.
	PhoneNumberExists(ctx context.Context, phoneNumber string) (bool, error)
}

// LeagueData contains information needed to build a jornada template.
type LeagueData struct {
	LeagueID       uuid.UUID
	LeagueName     string
	LeagueSlug     string
	TournamentID   uuid.UUID
	TournamentName string
	Round          int
	Matches        []JornadaMatch
}

// JornadaMatch is match info for jornada template.
type JornadaMatch struct {
	HomeTeam string
	AwayTeam string
	Time     string
}

// MatchData contains information for a result notification.
type MatchData struct {
	LeagueID       uuid.UUID
	LeagueName     string
	TournamentName string
	Round          int
	HomeTeam       string
	HomeScore      int
	AwayTeam       string
	AwayScore      int
}

// Sender sends template messages to phone numbers.
type Sender interface {
	// SendTemplate sends a single template message with the full payload.
	// Phone number is normalized (E.164 without +).
	SendTemplate(ctx context.Context, to string, payload *TemplatePayload) error
}

// SendLeagueNotificationRequest is the payload to send league notifications (IDs only).
type SendLeagueNotificationRequest struct {
	LeagueID     uuid.UUID `json:"league_id"`
	TournamentID uuid.UUID `json:"tournament_id"`
	Round        int       `json:"round"`
}

// Validate checks the request for errors.
func (r *SendLeagueNotificationRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.LeagueID == uuid.Nil {
		errs["league_id"] = "requerido"
	}
	if r.TournamentID == uuid.Nil {
		errs["tournament_id"] = "requerido"
	}
	if r.Round <= 0 {
		errs["round"] = "debe ser mayor a 0"
	}
	return errs
}

// SendMatchFinalizedRequest is the payload when a match is finalized (IDs only).
type SendMatchFinalizedRequest struct {
	MatchID uuid.UUID `json:"match_id"`
}

// Validate checks the request for errors.
func (r *SendMatchFinalizedRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.MatchID == uuid.Nil {
		errs["match_id"] = "requerido"
	}
	return errs
}

// TestNotificationRequest is the payload for test endpoint.
type TestNotificationRequest struct {
	PhoneNumber string `json:"phone_number"`
}

// Validate checks the request for errors.
func (r *TestNotificationRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if !isValidPhoneNumber(r.PhoneNumber) {
		errs["phone_number"] = "formato E.164 inválido (10-15 dígitos)"
	}
	return errs
}

// Config holds external service configuration.
type Config struct {
	KapsoBaseURL       string
	KapsoAPIKey        string
	PhoneNumberID      string
	TemplateJornada    string
	TemplateResultados string
	PublicSiteURL      string
	// Rate limit: max messages per phone number per window
	RateLimitMaxPerPhone int
	// Rate limit: sliding window duration
	RateLimitWindow time.Duration
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
