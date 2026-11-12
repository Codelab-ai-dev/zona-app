package teams

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// TeamPlayerStats are a player's totals, public (no personal data).
type TeamPlayerStats struct {
	PlayerID      uuid.UUID `json:"player_id"`
	Name          string    `json:"name"`
	JerseyNumber  int       `json:"jersey_number"`
	Position      string    `json:"position"`
	Photo         *string   `json:"photo,omitempty"`
	MatchesPlayed int       `json:"matches_played"`
	Goals         int       `json:"goals"`
	Assists       int       `json:"assists"`
	YellowCards   int       `json:"yellow_cards"`
	RedCards      int       `json:"red_cards"`
	MinutesPlayed int       `json:"minutes_played"`
}

// ListTeamPlayerStats returns every active player of a team with totals,
// optionally limited to one tournament (match stats of its matches plus its
// manual entries). Public: the team's league must be active.
func (s *Service) ListTeamPlayerStats(ctx context.Context, teamID uuid.UUID, tournamentID *uuid.UUID) ([]TeamPlayerStats, error) {
	var visible bool
	err := s.pool.QueryRow(ctx, `
		SELECT COALESCE(l.is_active, false) FROM public.teams t JOIN public.leagues l ON l.id = t.league_id WHERE t.id = $1`,
		teamID).Scan(&visible)
	if err != nil || !visible {
		return nil, httpx.ErrNotFound
	}
	rows, err := s.pool.Query(ctx, `
		SELECT p.id, p.name, p.jersey_number, p.position, p.photo,
		       count(ps.match_id)::int,
		       COALESCE(sum(ps.goals), 0)::int, COALESCE(sum(ps.assists), 0)::int,
		       COALESCE(sum(ps.yellow_cards), 0)::int, COALESCE(sum(ps.red_cards), 0)::int,
		       COALESCE(sum(ps.minutes_played), 0)::int
		FROM public.players p
		LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND (
			$2::uuid IS NULL
			OR ps.tournament_id = $2
			OR EXISTS (SELECT 1 FROM public.matches m WHERE m.id = ps.match_id AND m.tournament_id = $2))
		WHERE p.team_id = $1 AND p.is_active
		GROUP BY p.id
		ORDER BY 7 DESC, p.jersey_number`, teamID, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("team player stats: %w", err)
	}
	out, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (TeamPlayerStats, error) {
		var v TeamPlayerStats
		err := r.Scan(&v.PlayerID, &v.Name, &v.JerseyNumber, &v.Position, &v.Photo,
			&v.MatchesPlayed, &v.Goals, &v.Assists, &v.YellowCards, &v.RedCards, &v.MinutesPlayed)
		return v, err
	})
	if err != nil {
		return nil, fmt.Errorf("scan team player stats: %w", err)
	}
	return out, nil
}

func (h *Handler) getTeamPlayerStats(w http.ResponseWriter, r *http.Request) {
	teamID, err := httpx.UUIDParam(r, "teamID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var tournamentID *uuid.UUID
	if r.URL.Query().Get("tournament_id") != "" {
		id, err := httpx.UUIDQuery(r, "tournament_id")
		if err != nil {
			httpx.WriteError(w, r, err)
			return
		}
		tournamentID = &id
	}
	items, err := h.svc.ListTeamPlayerStats(r.Context(), teamID, tournamentID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.List(w, items, httpx.Page{Limit: len(items)}.WithTotal(len(items)))
}
