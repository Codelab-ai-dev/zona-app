package teams

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// League-wide view of identity verification for league admins: every
// player of the league with its status, filters and counters.

// VerificationStatus groups players for the league view.
const (
	VerificationPending    = "pending"     // document uploaded, not reviewed yet
	VerificationVerified   = "verified"    // reviewed and verified
	VerificationNoDocument = "no_document" // nothing uploaded
)

// LeaguePlayerVerification is one row of the league view.
type LeaguePlayerVerification struct {
	PlayerID     uuid.UUID   `json:"player_id"`
	Name         string      `json:"name"`
	JerseyNumber int         `json:"jersey_number"`
	Position     string      `json:"position"`
	BirthDate    *httpx.Date `json:"birth_date,omitempty"`
	TeamID       uuid.UUID   `json:"team_id"`
	TeamName     string      `json:"team_name"`
	Status       string      `json:"status"`
	DocumentKey  *string     `json:"document_key,omitempty"`
	VerifiedAt   *time.Time  `json:"id_verified_at,omitempty"`
}

// VerificationSummary counts the league's players by status.
type VerificationSummary struct {
	Total      int `json:"total"`
	Pending    int `json:"pending"`
	Verified   int `json:"verified"`
	NoDocument int `json:"no_document"`
}

const verificationStatusSQL = `CASE
	WHEN COALESCE(p.id_verified, false) THEN 'verified'
	WHEN p.id_document_url IS NOT NULL THEN 'pending'
	ELSE 'no_document' END`

// ListLeagueVerification lists active players of a league (league admin).
func (s *Service) ListLeagueVerification(ctx context.Context, caller auth.Principal, leagueID uuid.UUID,
	status string, teamID *uuid.UUID, q string, ageOnly bool, page httpx.Page) ([]LeaguePlayerVerification, int, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, 0, err
	}
	if status != "" && status != VerificationPending && status != VerificationVerified && status != VerificationNoDocument {
		return nil, 0, httpx.Validation(map[string]string{"status": "debe ser pending, verified o no_document"})
	}
	pattern := ""
	if q = strings.TrimSpace(q); q != "" {
		pattern = "%" + strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(q) + "%"
	}
	rows, err := s.pool.Query(ctx, `
		SELECT p.id, p.name, p.jersey_number, p.position, p.birth_date, t.id, t.name,
		       `+verificationStatusSQL+` AS status, p.id_document_url, p.id_verified_at,
		       count(*) OVER () AS total
		FROM public.players p JOIN public.teams t ON t.id = p.team_id
		WHERE t.league_id = $1 AND p.is_active
		  AND ($2 = '' OR `+verificationStatusSQL+` = $2)
		  AND ($3::uuid IS NULL OR t.id = $3)
		  AND ($4 = '' OR p.name ILIKE $4)
		  AND (NOT $7 OR `+ageValidatedTeam+`)
		ORDER BY t.name, p.jersey_number
		LIMIT $5 OFFSET $6`, leagueID, status, teamID, pattern, page.Limit, page.Offset, ageOnly)
	if err != nil {
		return nil, 0, fmt.Errorf("list league verification: %w", err)
	}
	total := 0
	items, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (LeaguePlayerVerification, error) {
		var v LeaguePlayerVerification
		err := r.Scan(&v.PlayerID, &v.Name, &v.JerseyNumber, &v.Position, &v.BirthDate, &v.TeamID, &v.TeamName,
			&v.Status, &v.DocumentKey, &v.VerifiedAt, &total)
		return v, err
	})
	if err != nil {
		return nil, 0, fmt.Errorf("scan league verification: %w", err)
	}
	return items, total, nil
}

// ageValidatedTeam limits to teams whose tournament validates ages (as the
// original verification screen did).
const ageValidatedTeam = `EXISTS (SELECT 1 FROM public.tournaments tr WHERE tr.id = t.tournament_id AND tr.age_validation_enabled)`

// LeagueVerificationSummary counts players by status.
func (s *Service) LeagueVerificationSummary(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, ageOnly bool) (VerificationSummary, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return VerificationSummary{}, err
	}
	var sum VerificationSummary
	err := s.pool.QueryRow(ctx, `
		SELECT count(*),
		       count(*) FILTER (WHERE `+verificationStatusSQL+` = 'pending'),
		       count(*) FILTER (WHERE `+verificationStatusSQL+` = 'verified'),
		       count(*) FILTER (WHERE `+verificationStatusSQL+` = 'no_document')
		FROM public.players p JOIN public.teams t ON t.id = p.team_id
		WHERE t.league_id = $1 AND p.is_active AND (NOT $2 OR `+ageValidatedTeam+`)`, leagueID, ageOnly).
		Scan(&sum.Total, &sum.Pending, &sum.Verified, &sum.NoDocument)
	if err != nil {
		return VerificationSummary{}, fmt.Errorf("verification summary: %w", err)
	}
	return sum, nil
}

func (h *Handler) listLeagueVerification(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var teamID *uuid.UUID
	if r.URL.Query().Get("team_id") != "" {
		id, err := httpx.UUIDQuery(r, "team_id")
		if err != nil {
			httpx.WriteError(w, r, err)
			return
		}
		teamID = &id
	}
	q := r.URL.Query()
	ageOnly := q.Get("age_validation") == "true"
	items, total, err := h.svc.ListLeagueVerification(r.Context(), caller, leagueID, q.Get("status"), teamID, q.Get("q"), ageOnly, page)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.List(w, items, page.WithTotal(total))
}

func (h *Handler) leagueVerificationSummary(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	sum, err := h.svc.LeagueVerificationSummary(r.Context(), caller, leagueID, r.URL.Query().Get("age_validation") == "true")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, sum)
}
