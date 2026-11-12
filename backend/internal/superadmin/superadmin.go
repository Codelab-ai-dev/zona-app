// Package superadmin holds platform-wide operations only super admins may
// run: global statistics, assigning a league's admin and deleting leagues.
package superadmin

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Count is a total with how many are active.
type Count struct {
	Total  int `json:"total"`
	Active int `json:"active"`
}

// Stats are platform-wide counts (computed server-side, never capped).
type Stats struct {
	Leagues      Count `json:"leagues"`
	Tournaments  Count `json:"tournaments"`
	Teams        Count `json:"teams"`
	Players      Count `json:"players"`
	Users        Count `json:"users"`
	LeagueAdmins int   `json:"league_admins"`
	TeamOwners   int   `json:"team_owners"`
	// Matches: total and played this month; goals scored this month.
	Matches        MatchCount     `json:"matches"`
	GoalsThisMonth int            `json:"goals_this_month"`
	TopScorers     []GlobalScorer `json:"top_scorers"`
	RecentMatches  []RecentMatch  `json:"recent_matches"`
}

// MatchCount counts matches.
type MatchCount struct {
	Total     int `json:"total"`
	Finished  int `json:"finished"`
	ThisMonth int `json:"this_month"`
}

// GlobalScorer is a top scorer across all leagues.
type GlobalScorer struct {
	PlayerID   uuid.UUID `json:"player_id"`
	PlayerName string    `json:"player_name"`
	TeamName   string    `json:"team_name"`
	LeagueName string    `json:"league_name"`
	Goals      int       `json:"goals"`
}

// RecentMatch is a recently finished match.
type RecentMatch struct {
	ID           uuid.UUID `json:"id"`
	MatchDate    time.Time `json:"match_date"`
	LeagueName   string    `json:"league_name"`
	HomeTeamName string    `json:"home_team_name"`
	AwayTeamName string    `json:"away_team_name"`
	HomeScore    *int      `json:"home_score,omitempty"`
	AwayScore    *int      `json:"away_score,omitempty"`
}

// SetAdminRequest assigns a league's administrator.
type SetAdminRequest struct {
	AdminID uuid.UUID `json:"admin_id"`
}

// Validate implements httpx.Validator.
func (r SetAdminRequest) Validate() map[string]string {
	if r.AdminID == uuid.Nil {
		return map[string]string{"admin_id": "requerido"}
	}
	return nil
}

// Service implements the super admin operations.
type Service struct{ pool *pgxpool.Pool }

// NewService builds the service.
func NewService(pool *pgxpool.Pool) *Service { return &Service{pool: pool} }

// Stats counts leagues, tournaments, teams, players and users.
func (s *Service) Stats(ctx context.Context) (Stats, error) {
	var st Stats
	err := s.pool.QueryRow(ctx, `
		SELECT
		  (SELECT count(*) FROM public.leagues), (SELECT count(*) FROM public.leagues WHERE is_active),
		  (SELECT count(*) FROM public.tournaments), (SELECT count(*) FROM public.tournaments WHERE is_active),
		  (SELECT count(*) FROM public.teams), (SELECT count(*) FROM public.teams WHERE is_active),
		  (SELECT count(*) FROM public.players), (SELECT count(*) FROM public.players WHERE is_active),
		  (SELECT count(*) FROM public.users), (SELECT count(*) FROM public.users WHERE is_active),
		  (SELECT count(*) FROM public.users WHERE role = 'league_admin'),
		  (SELECT count(*) FROM public.users WHERE role = 'team_owner')`).Scan(
		&st.Leagues.Total, &st.Leagues.Active, &st.Tournaments.Total, &st.Tournaments.Active,
		&st.Teams.Total, &st.Teams.Active, &st.Players.Total, &st.Players.Active,
		&st.Users.Total, &st.Users.Active, &st.LeagueAdmins, &st.TeamOwners)
	if err != nil {
		return Stats{}, fmt.Errorf("admin stats: %w", err)
	}
	const thisMonth = `date_trunc('month', m.match_date AT TIME ZONE 'UTC') = date_trunc('month', now() AT TIME ZONE 'UTC')`
	err = s.pool.QueryRow(ctx, `
		SELECT count(*), count(*) FILTER (WHERE m.status = 'finished'),
		       count(*) FILTER (WHERE m.status = 'finished' AND `+thisMonth+`),
		       COALESCE(sum(COALESCE(m.home_score, 0) + COALESCE(m.away_score, 0)) FILTER (WHERE m.status = 'finished' AND `+thisMonth+`), 0)
		FROM public.matches m`).Scan(&st.Matches.Total, &st.Matches.Finished, &st.Matches.ThisMonth, &st.GoalsThisMonth)
	if err != nil {
		return Stats{}, fmt.Errorf("admin match stats: %w", err)
	}
	rows, err := s.pool.Query(ctx, `
		SELECT p.id, p.name, t.name, l.name, sum(ps.goals)::int
		FROM public.player_stats ps
		JOIN public.players p ON p.id = ps.player_id
		JOIN public.teams t ON t.id = p.team_id
		JOIN public.leagues l ON l.id = t.league_id
		GROUP BY p.id, p.name, t.name, l.name
		HAVING sum(ps.goals) > 0
		ORDER BY sum(ps.goals) DESC, p.name LIMIT 5`)
	if err != nil {
		return Stats{}, fmt.Errorf("admin top scorers: %w", err)
	}
	st.TopScorers, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (GlobalScorer, error) {
		var g GlobalScorer
		err := r.Scan(&g.PlayerID, &g.PlayerName, &g.TeamName, &g.LeagueName, &g.Goals)
		return g, err
	})
	if err != nil {
		return Stats{}, fmt.Errorf("scan top scorers: %w", err)
	}
	rows, err = s.pool.Query(ctx, `
		SELECT m.id, m.match_date, l.name, ht.name, at.name, m.home_score, m.away_score
		FROM public.matches m
		JOIN public.tournaments tr ON tr.id = m.tournament_id
		JOIN public.leagues l ON l.id = tr.league_id
		JOIN public.teams ht ON ht.id = m.home_team_id
		JOIN public.teams at ON at.id = m.away_team_id
		WHERE m.status = 'finished'
		ORDER BY m.match_date DESC, m.updated_at DESC LIMIT 5`)
	if err != nil {
		return Stats{}, fmt.Errorf("admin recent matches: %w", err)
	}
	st.RecentMatches, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (RecentMatch, error) {
		var m RecentMatch
		err := r.Scan(&m.ID, &m.MatchDate, &m.LeagueName, &m.HomeTeamName, &m.AwayTeamName, &m.HomeScore, &m.AwayScore)
		return m, err
	})
	if err != nil {
		return Stats{}, fmt.Errorf("scan recent matches: %w", err)
	}
	return st, nil
}

// SetLeagueAdmin makes an active league_admin user the league's admin and
// links the user to the league.
func (s *Service) SetLeagueAdmin(ctx context.Context, caller auth.Principal, leagueID, adminID uuid.UUID) error {
	return database.WithUserTx(ctx, s.pool, caller.UserID, func(tx pgx.Tx) error {
		var role string
		var active bool
		err := tx.QueryRow(ctx, `SELECT role, is_active FROM public.users WHERE id = $1`, adminID).Scan(&role, &active)
		if database.IsNoRows(err) {
			return httpx.Validation(map[string]string{"admin_id": "el usuario no existe"})
		}
		if err != nil {
			return fmt.Errorf("load user: %w", err)
		}
		if role != "league_admin" || !active {
			return httpx.Validation(map[string]string{"admin_id": "debe ser un administrador de liga activo"})
		}
		tag, err := tx.Exec(ctx, `UPDATE public.leagues SET admin_id = $2, updated_at = now() WHERE id = $1`, leagueID, adminID)
		if err != nil {
			return fmt.Errorf("set league admin: %w", err)
		}
		if tag.RowsAffected() == 0 {
			return httpx.ErrNotFound
		}
		_, err = tx.Exec(ctx, `UPDATE public.users SET league_id = $2, updated_at = now() WHERE id = $1`, adminID, leagueID)
		return err
	})
}

// DeleteLeague permanently deletes a league: tournaments, teams, players,
// matches, finance and links cascade; users and videos are kept unlinked.
func (s *Service) DeleteLeague(ctx context.Context, caller auth.Principal, leagueID uuid.UUID) error {
	return database.WithUserTx(ctx, s.pool, caller.UserID, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `DELETE FROM public.leagues WHERE id = $1`, leagueID)
		if err != nil {
			return fmt.Errorf("delete league: %w", err)
		}
		if tag.RowsAffected() == 0 {
			return httpx.ErrNotFound
		}
		return nil
	})
}

// Handler exposes the routes (super admin only).
type Handler struct{ svc *Service }

// NewHandler builds the handler.
func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	sa := r.With(auth.RequireAuth, auth.RequireRole(auth.RoleSuperAdmin))
	sa.Get("/admin/stats", h.stats)
	sa.Put("/leagues/{leagueID}/admin", h.setAdmin)
	sa.Delete("/leagues/{leagueID}", h.deleteLeague)
}

func (h *Handler) stats(w http.ResponseWriter, r *http.Request) {
	st, err := h.svc.Stats(r.Context())
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, st)
}

func (h *Handler) setAdmin(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req SetAdminRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	if err := h.svc.SetLeagueAdmin(r.Context(), caller, leagueID, req.AdminID); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.NoContent(w)
}

func (h *Handler) deleteLeague(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	if err := h.svc.DeleteLeague(r.Context(), caller, leagueID); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.NoContent(w)
}
