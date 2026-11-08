// Package superadmin holds platform-wide operations only super admins may
// run: global statistics, assigning a league's admin and deleting leagues.
package superadmin

import (
	"context"
	"fmt"
	"net/http"

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
