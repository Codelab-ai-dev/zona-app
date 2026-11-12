// Package leaguedata serves league-wide reads the mobile app needs:
// statistics, top scorers and discipline across all of a league's
// tournaments, the league's player list (admins) and a player's match
// history. Public reads follow the API's rules: active leagues only and,
// for matches, published ones only.
package leaguedata

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// LeagueStats summarises a league.
type LeagueStats struct {
	Teams           int `json:"teams"`
	Players         int `json:"players"`
	Matches         int `json:"matches"`
	FinishedMatches int `json:"finished_matches"`
	Goals           int `json:"goals"`
	YellowCards     int `json:"yellow_cards"`
	RedCards        int `json:"red_cards"`
	// Matches still to play, and this month's (UTC) finished matches/goals.
	ScheduledMatches int `json:"scheduled_matches"`
	MatchesThisMonth int `json:"matches_this_month"`
	GoalsThisMonth   int `json:"goals_this_month"`
	// Finished matches by outcome.
	Results         ResultSplit      `json:"results"`
	TopScorer       *PlayerTotals    `json:"top_scorer,omitempty"`
	UpcomingMatches []MatchSummary   `json:"upcoming_matches"`
	MatchesPerMonth []MonthlyMatches `json:"matches_per_month"`
}

// ResultSplit counts finished matches by outcome.
type ResultSplit struct {
	HomeWins int `json:"home_wins"`
	Draws    int `json:"draws"`
	AwayWins int `json:"away_wins"`
}

// MonthlyMatches counts finished matches of a month (YYYY-MM).
type MonthlyMatches struct {
	Month   string `json:"month"`
	Matches int    `json:"matches"`
}

// MatchSummary is a match with team names.
type MatchSummary struct {
	ID           uuid.UUID `json:"id"`
	TournamentID uuid.UUID `json:"tournament_id"`
	MatchDate    time.Time `json:"match_date"`
	MatchTime    *string   `json:"match_time,omitempty"`
	Round        *int      `json:"round,omitempty"`
	Status       string    `json:"status"`
	HomeTeamID   uuid.UUID `json:"home_team_id"`
	HomeTeamName string    `json:"home_team_name"`
	AwayTeamID   uuid.UUID `json:"away_team_id"`
	AwayTeamName string    `json:"away_team_name"`
	HomeScore    *int      `json:"home_score,omitempty"`
	AwayScore    *int      `json:"away_score,omitempty"`
}

// PlayerTotals are a player's totals in the league.
type PlayerTotals struct {
	PlayerID      uuid.UUID `json:"player_id"`
	PlayerName    string    `json:"player_name"`
	JerseyNumber  int       `json:"jersey_number"`
	Position      string    `json:"position"`
	Photo         *string   `json:"photo,omitempty"`
	TeamID        uuid.UUID `json:"team_id"`
	TeamName      string    `json:"team_name"`
	MatchesPlayed int       `json:"matches_played"`
	Goals         int       `json:"goals"`
	Assists       int       `json:"assists"`
	YellowCards   int       `json:"yellow_cards"`
	RedCards      int       `json:"red_cards"`
	MinutesPlayed int       `json:"minutes_played"`
}

// LeaguePlayer is a row of the admin player list.
type LeaguePlayer struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	JerseyNumber int       `json:"jersey_number"`
	Position     string    `json:"position"`
	Photo        *string   `json:"photo,omitempty"`
	TeamID       uuid.UUID `json:"team_id"`
	TeamName     string    `json:"team_name"`
	IsActive     bool      `json:"is_active"`
	IDVerified   bool      `json:"id_verified"`
}

// PlayerMatch is a player's line in one finished, published match.
type PlayerMatch struct {
	MatchSummary
	IsHome        bool `json:"is_home"`
	Goals         int  `json:"goals"`
	Assists       int  `json:"assists"`
	YellowCards   int  `json:"yellow_cards"`
	RedCards      int  `json:"red_cards"`
	MinutesPlayed int  `json:"minutes_played"`
}

// Service implements the reads.
type Service struct {
	pool  *pgxpool.Pool
	authz authz.Checker
}

// NewService builds the service.
func NewService(pool *pgxpool.Pool, checker authz.Checker) *Service {
	return &Service{pool: pool, authz: checker}
}

// visibleLeague returns 404 for unknown or inactive leagues, unless the
// caller manages it.
func (s *Service) visibleLeague(ctx context.Context, caller *auth.Principal, leagueID uuid.UUID) error {
	if caller != nil && s.authz.CanManageLeague(ctx, *caller, leagueID) == nil {
		return nil
	}
	var active bool
	err := s.pool.QueryRow(ctx, `SELECT is_active FROM public.leagues WHERE id = $1`, leagueID).Scan(&active)
	if err != nil || !active {
		return httpx.ErrNotFound
	}
	return nil
}

// matchesOfLeague restricts to the league's matches (published unless the
// caller manages the league).
const matchesOfLeague = `
	FROM public.matches m
	JOIN public.tournaments tr ON tr.id = m.tournament_id
	JOIN public.teams ht ON ht.id = m.home_team_id
	JOIN public.teams at ON at.id = m.away_team_id
	WHERE tr.league_id = $1 AND ($2 OR COALESCE(m.is_published, false))`

const matchSummaryCols = `m.id, m.tournament_id, m.match_date, m.match_time::text, m.round, m.status::text,
	m.home_team_id, ht.name, m.away_team_id, at.name, m.home_score, m.away_score`

func scanSummary(r pgx.Row, m *MatchSummary, extra ...any) error {
	var t *string
	dest := append([]any{&m.ID, &m.TournamentID, &m.MatchDate, &t, &m.Round, &m.Status,
		&m.HomeTeamID, &m.HomeTeamName, &m.AwayTeamID, &m.AwayTeamName, &m.HomeScore, &m.AwayScore}, extra...)
	if err := r.Scan(dest...); err != nil {
		return err
	}
	if t != nil && len(*t) >= 5 {
		hhmm := (*t)[:5]
		m.MatchTime = &hhmm
	}
	return nil
}

// Stats returns the league summary.
func (s *Service) Stats(ctx context.Context, caller *auth.Principal, leagueID uuid.UUID) (LeagueStats, error) {
	if err := s.visibleLeague(ctx, caller, leagueID); err != nil {
		return LeagueStats{}, err
	}
	manager := caller != nil && s.authz.CanManageLeague(ctx, *caller, leagueID) == nil
	st := LeagueStats{UpcomingMatches: []MatchSummary{}, MatchesPerMonth: []MonthlyMatches{}}
	err := s.pool.QueryRow(ctx, `
		SELECT
		  (SELECT count(*) FROM public.teams WHERE league_id = $1 AND is_active),
		  (SELECT count(*) FROM public.players p JOIN public.teams t ON t.id = p.team_id WHERE t.league_id = $1 AND p.is_active),
		  (SELECT count(*) `+matchesOfLeague+`),
		  (SELECT count(*) `+matchesOfLeague+` AND m.status = 'finished'),
		  (SELECT COALESCE(sum(COALESCE(m.home_score,0) + COALESCE(m.away_score,0)), 0) `+matchesOfLeague+` AND m.status = 'finished'),
		  (SELECT COALESCE(sum(c.yellow_cards), 0) FROM public.tournaments tr, public.tournament_player_totals(tr.id) c WHERE tr.league_id = $1),
		  (SELECT COALESCE(sum(c.red_cards), 0) FROM public.tournaments tr, public.tournament_player_totals(tr.id) c WHERE tr.league_id = $1)`,
		leagueID, manager).Scan(&st.Teams, &st.Players, &st.Matches, &st.FinishedMatches, &st.Goals, &st.YellowCards, &st.RedCards)
	if err != nil {
		return LeagueStats{}, fmt.Errorf("league stats: %w", err)
	}
	const thisMonth = `date_trunc('month', m.match_date AT TIME ZONE 'UTC') = date_trunc('month', now() AT TIME ZONE 'UTC')`
	err = s.pool.QueryRow(ctx, `
		SELECT count(*) FILTER (WHERE m.status = 'scheduled'),
		       count(*) FILTER (WHERE m.status = 'finished' AND `+thisMonth+`),
		       COALESCE(sum(COALESCE(m.home_score,0) + COALESCE(m.away_score,0)) FILTER (WHERE m.status = 'finished' AND `+thisMonth+`), 0),
		       count(*) FILTER (WHERE m.status = 'finished' AND m.home_score > m.away_score),
		       count(*) FILTER (WHERE m.status = 'finished' AND m.home_score = m.away_score),
		       count(*) FILTER (WHERE m.status = 'finished' AND m.home_score < m.away_score)
		`+matchesOfLeague, leagueID, manager).Scan(&st.ScheduledMatches, &st.MatchesThisMonth, &st.GoalsThisMonth,
		&st.Results.HomeWins, &st.Results.Draws, &st.Results.AwayWins)
	if err != nil {
		return LeagueStats{}, fmt.Errorf("league match split: %w", err)
	}
	scorers, err := s.Totals(ctx, caller, leagueID, "goals", 1)
	if err != nil {
		return LeagueStats{}, err
	}
	if len(scorers) > 0 {
		st.TopScorer = &scorers[0]
	}
	rows, err := s.pool.Query(ctx, `SELECT `+matchSummaryCols+matchesOfLeague+`
		AND m.status = 'scheduled' AND m.match_date >= current_date
		ORDER BY m.match_date, m.match_time LIMIT 10`, leagueID, manager)
	if err != nil {
		return LeagueStats{}, fmt.Errorf("upcoming matches: %w", err)
	}
	for rows.Next() {
		var m MatchSummary
		if err := scanSummary(rows, &m); err != nil {
			rows.Close()
			return LeagueStats{}, fmt.Errorf("scan upcoming: %w", err)
		}
		st.UpcomingMatches = append(st.UpcomingMatches, m)
	}
	rows.Close()
	rows, err = s.pool.Query(ctx, `SELECT to_char(m.match_date, 'YYYY-MM'), count(*)`+matchesOfLeague+`
		AND m.status = 'finished' GROUP BY 1 ORDER BY 1`, leagueID, manager)
	if err != nil {
		return LeagueStats{}, fmt.Errorf("matches per month: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var mm MonthlyMatches
		if err := rows.Scan(&mm.Month, &mm.Matches); err != nil {
			return LeagueStats{}, fmt.Errorf("scan month: %w", err)
		}
		st.MatchesPerMonth = append(st.MatchesPerMonth, mm)
	}
	return st, rows.Err()
}

// Totals ranks the league's players by "goals" (scorers) or "discipline"
// (cards), summing every tournament of the league including manual stats.
func (s *Service) Totals(ctx context.Context, caller *auth.Principal, leagueID uuid.UUID, by string, limit int) ([]PlayerTotals, error) {
	if err := s.visibleLeague(ctx, caller, leagueID); err != nil {
		return nil, err
	}
	having, order := "sum(c.goals) > 0", "sum(c.goals) DESC, sum(c.assists) DESC"
	if by == "discipline" {
		having = "sum(c.yellow_cards) + sum(c.red_cards) > 0"
		order = "sum(c.yellow_cards) + 3 * sum(c.red_cards) DESC, sum(c.yellow_cards) DESC"
	}
	rows, err := s.pool.Query(ctx, `
		SELECT c.player_id, c.player_name, c.jersey_number, c.position, c.photo, c.team_id, c.team_name,
		       sum(c.matches_played)::int, sum(c.goals)::int, sum(c.assists)::int,
		       sum(c.yellow_cards)::int, sum(c.red_cards)::int, sum(c.minutes_played)::int
		FROM public.tournaments tr, public.tournament_player_totals(tr.id) c
		WHERE tr.league_id = $1
		GROUP BY c.player_id, c.player_name, c.jersey_number, c.position, c.photo, c.team_id, c.team_name
		HAVING `+having+`
		ORDER BY `+order+`, c.player_name
		LIMIT $2`, leagueID, limit)
	if err != nil {
		return nil, fmt.Errorf("league totals: %w", err)
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (PlayerTotals, error) {
		var p PlayerTotals
		err := r.Scan(&p.PlayerID, &p.PlayerName, &p.JerseyNumber, &p.Position, &p.Photo, &p.TeamID, &p.TeamName,
			&p.MatchesPlayed, &p.Goals, &p.Assists, &p.YellowCards, &p.RedCards, &p.MinutesPlayed)
		return p, err
	})
}

// Players lists the league's players (league admins and super admins).
func (s *Service) Players(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, q string, teamID *uuid.UUID, includeInactive bool, page httpx.Page) ([]LeaguePlayer, int, error) {
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, 0, err
	}
	pattern := ""
	if q = strings.TrimSpace(q); q != "" {
		pattern = "%" + strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(q) + "%"
	}
	rows, err := s.pool.Query(ctx, `
		SELECT p.id, p.name, p.jersey_number, p.position, p.photo, t.id, t.name, COALESCE(p.is_active, true),
		       COALESCE(p.id_verified, false), count(*) OVER ()
		FROM public.players p JOIN public.teams t ON t.id = p.team_id
		WHERE t.league_id = $1 AND ($2 OR p.is_active)
		  AND ($3::uuid IS NULL OR t.id = $3) AND ($4 = '' OR p.name ILIKE $4)
		ORDER BY t.name, p.jersey_number
		LIMIT $5 OFFSET $6`, leagueID, includeInactive, teamID, pattern, page.Limit, page.Offset)
	if err != nil {
		return nil, 0, fmt.Errorf("league players: %w", err)
	}
	total := 0
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (LeaguePlayer, error) {
		var p LeaguePlayer
		err := r.Scan(&p.ID, &p.Name, &p.JerseyNumber, &p.Position, &p.Photo, &p.TeamID, &p.TeamName, &p.IsActive, &p.IDVerified, &total)
		return p, err
	})
	return list, total, err
}

// PlayerMatches is a player's history in finished matches (published ones
// unless the caller manages the league).
func (s *Service) PlayerMatches(ctx context.Context, caller *auth.Principal, playerID uuid.UUID, page httpx.Page) ([]PlayerMatch, error) {
	var leagueID, teamID uuid.UUID
	err := s.pool.QueryRow(ctx, `SELECT t.league_id, t.id FROM public.players p JOIN public.teams t ON t.id = p.team_id WHERE p.id = $1`,
		playerID).Scan(&leagueID, &teamID)
	if err != nil {
		return nil, httpx.ErrNotFound
	}
	if err := s.visibleLeague(ctx, caller, leagueID); err != nil {
		return nil, err
	}
	manager := caller != nil && s.authz.CanManageLeague(ctx, *caller, leagueID) == nil
	rows, err := s.pool.Query(ctx, `SELECT `+matchSummaryCols+`, m.home_team_id = $3,
		       ps.goals, ps.assists, ps.yellow_cards, ps.red_cards, ps.minutes_played
		FROM public.matches m
		JOIN public.tournaments tr ON tr.id = m.tournament_id
		JOIN public.teams ht ON ht.id = m.home_team_id
		JOIN public.teams at ON at.id = m.away_team_id
		JOIN LATERAL (
		  SELECT COALESCE(sum(x.goals), 0)::int AS goals, COALESCE(sum(x.assists), 0)::int AS assists,
		         COALESCE(sum(x.yellow_cards), 0)::int AS yellow_cards, COALESCE(sum(x.red_cards), 0)::int AS red_cards,
		         COALESCE(sum(x.minutes_played), 0)::int AS minutes_played
		  FROM public.player_stats x WHERE x.player_id = $4 AND x.match_id = m.id
		  HAVING count(*) > 0) ps ON true
		WHERE tr.league_id = $1 AND ($2 OR COALESCE(m.is_published, false))
		  AND m.status = 'finished' AND $3 IN (m.home_team_id, m.away_team_id)
		ORDER BY m.match_date DESC LIMIT $5 OFFSET $6`, leagueID, manager, teamID, playerID, page.Limit, page.Offset)
	if err != nil {
		return nil, fmt.Errorf("player matches: %w", err)
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (PlayerMatch, error) {
		var pm PlayerMatch
		err := scanSummary(r, &pm.MatchSummary, &pm.IsHome, &pm.Goals, &pm.Assists, &pm.YellowCards, &pm.RedCards, &pm.MinutesPlayed)
		return pm, err
	})
}

// Handler exposes the routes.
type Handler struct{ svc *Service }

// NewHandler builds the handler.
func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Routes implements server.Module.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/leagues/{leagueID}/stats", h.stats)
	r.Get("/leagues/{leagueID}/top-scorers", h.totals("goals"))
	r.Get("/leagues/{leagueID}/discipline", h.totals("discipline"))
	r.With(auth.RequireAuth).Get("/leagues/{leagueID}/players", h.players)
	r.Get("/players/{playerID}/matches", h.playerMatches)
}

func optionalCaller(r *http.Request) *auth.Principal {
	if p, ok := auth.FromContext(r.Context()); ok {
		return &p
	}
	return nil
}

func (h *Handler) stats(w http.ResponseWriter, r *http.Request) {
	leagueID, err := httpx.UUIDParam(r, "leagueID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	st, err := h.svc.Stats(r.Context(), optionalCaller(r), leagueID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, st)
}

func (h *Handler) totals(by string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		leagueID, err := httpx.UUIDParam(r, "leagueID")
		if err != nil {
			httpx.WriteError(w, r, err)
			return
		}
		limit := 20
		if v := r.URL.Query().Get("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
				limit = n
			}
		}
		list, err := h.svc.Totals(r.Context(), optionalCaller(r), leagueID, by, limit)
		if err != nil {
			httpx.WriteError(w, r, err)
			return
		}
		httpx.List(w, list, httpx.Page{Limit: limit}.WithTotal(len(list)))
	}
}

func (h *Handler) players(w http.ResponseWriter, r *http.Request) {
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
	list, total, err := h.svc.Players(r.Context(), caller, leagueID, r.URL.Query().Get("q"), teamID,
		r.URL.Query().Get("include_inactive") == "true", page)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.List(w, list, page.WithTotal(total))
}

func (h *Handler) playerMatches(w http.ResponseWriter, r *http.Request) {
	playerID, err := httpx.UUIDParam(r, "playerID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	page, err := httpx.ParsePage(r)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	list, err := h.svc.PlayerMatches(r.Context(), optionalCaller(r), playerID, page)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.List(w, list, page)
}
