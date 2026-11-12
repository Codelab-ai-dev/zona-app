package stats

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// PGRepository implements Repository with pgx. Every query is parameterized.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository builds a PostgreSQL-backed repository.
func NewPGRepository(db database.Querier) *PGRepository { return &PGRepository{db: db} }

// GetStandingsByTournament returns the league standings ordered with points_adjustment.
func (r *PGRepository) GetStandingsByTournament(ctx context.Context, tournamentID uuid.UUID, limit int) ([]Standings, error) {
	const q = `
		SELECT
			ROW_NUMBER() OVER (ORDER BY (ts.points + ts.points_adjustment) DESC, ts.goal_difference DESC, ts.goals_for DESC) AS position,
			ts.team_id, t.name, t.logo,
			ts.matches_played, ts.matches_won, ts.matches_drawn, ts.matches_lost,
			ts.goals_for, ts.goals_against, ts.goal_difference,
			ts.points, ts.points_adjustment, ts.adjustment_reason,
			ts.recent_form, ts.last_match_date, t.group_name
		FROM public.team_stats ts
		JOIN public.teams t ON t.id = ts.team_id
		WHERE ts.tournament_id = $1
		ORDER BY (ts.points + ts.points_adjustment) DESC, ts.goal_difference DESC, ts.goals_for DESC
		LIMIT $2`

	rows, err := r.db.Query(ctx, q, tournamentID, limit)
	if err != nil {
		return nil, fmt.Errorf("get standings: %w", err)
	}
	defer rows.Close()

	var standings []Standings
	for rows.Next() {
		var s Standings
		if err := rows.Scan(
			&s.Position, &s.TeamID, &s.TeamName, &s.TeamLogo,
			&s.MatchesPlayed, &s.MatchesWon, &s.MatchesDrawn, &s.MatchesLost,
			&s.GoalsFor, &s.GoalsAgainst, &s.GoalDifference,
			&s.Points, &s.PointsAdjustment, &s.AdjustmentReason,
			&s.RecentForm, &s.LastMatchDate, &s.GroupName,
		); err != nil {
			return nil, fmt.Errorf("scan standing: %w", err)
		}
		standings = append(standings, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("standings rows: %w", err)
	}
	return standings, nil
}

// GetTeamStats returns aggregated team statistics.
func (r *PGRepository) GetTeamStats(ctx context.Context, teamID uuid.UUID, tournamentID *uuid.UUID) (TeamStats, error) {
	const q = `
		SELECT id, team_id, tournament_id, league_id, matches_played, matches_won, matches_drawn, matches_lost,
		       goals_for, goals_against, goal_difference, points, clean_sheets, yellow_cards, red_cards,
		       points_adjustment, adjustment_reason, recent_form, last_match_date, created_at, updated_at
		FROM public.team_stats
		WHERE team_id = $1 AND ($2::uuid IS NULL OR tournament_id = $2)`

	var ts TeamStats
	err := r.db.QueryRow(ctx, q, teamID, tournamentID).Scan(
		&ts.ID, &ts.TeamID, &ts.TournamentID, &ts.LeagueID, &ts.MatchesPlayed, &ts.MatchesWon, &ts.MatchesDrawn, &ts.MatchesLost,
		&ts.GoalsFor, &ts.GoalsAgainst, &ts.GoalDifference, &ts.Points, &ts.CleanSheets, &ts.YellowCards, &ts.RedCards,
		&ts.PointsAdjustment, &ts.AdjustmentReason, &ts.RecentForm, &ts.LastMatchDate, &ts.CreatedAt, &ts.UpdatedAt,
	)
	if database.IsNoRows(err) {
		return TeamStats{}, httpx.ErrNotFound
	}
	if err != nil {
		return TeamStats{}, fmt.Errorf("get team stats: %w", err)
	}
	return ts, nil
}

// UpdateTeamPointsAdjustment updates points adjustment and reason for a team.
func (r *PGRepository) UpdateTeamPointsAdjustment(ctx context.Context, teamID uuid.UUID, tournamentID uuid.UUID, adjustment int, reason string) error {
	const q = `
		UPDATE public.team_stats
		SET points_adjustment = $1, adjustment_reason = $2, updated_at = now()
		WHERE team_id = $3 AND tournament_id = $4`

	if _, err := r.db.Exec(ctx, q, adjustment, reason, teamID, tournamentID); err != nil {
		return fmt.Errorf("update team points: %w", err)
	}
	return nil
}

// GetPlayerStats returns a player's aggregated statistics.
func (r *PGRepository) GetPlayerStats(ctx context.Context, playerID uuid.UUID) (PlayerStats, error) {
	const q = `
		SELECT
			p.id, p.name, p.jersey_number, p.position, p.photo,
			p.team_id, t.name,
			COUNT(ps.id) AS matches_played,
			COALESCE(SUM(ps.goals), 0) AS goals,
			COALESCE(SUM(ps.assists), 0) AS assists,
			COALESCE(SUM(ps.yellow_cards), 0) AS yellow_cards,
			COALESCE(SUM(ps.red_cards), 0) AS red_cards,
			COALESCE(SUM(ps.minutes_played), 0) AS minutes_played
		FROM public.players p
		LEFT JOIN public.player_stats ps ON ps.player_id = p.id
		JOIN public.teams t ON p.team_id = t.id
		WHERE p.id = $1
		GROUP BY p.id, p.name, p.jersey_number, p.position, p.photo, p.team_id, t.name`

	var ps PlayerStats
	err := r.db.QueryRow(ctx, q, playerID).Scan(
		&ps.ID, &ps.PlayerName, &ps.JerseyNumber, &ps.Position, &ps.Photo,
		&ps.TeamID, &ps.TeamName,
		&ps.MatchesPlayed, &ps.Goals, &ps.Assists, &ps.YellowCards, &ps.RedCards, &ps.MinutesPlayed,
	)
	if database.IsNoRows(err) {
		return PlayerStats{}, httpx.ErrNotFound
	}
	if err != nil {
		return PlayerStats{}, fmt.Errorf("get player stats: %w", err)
	}
	ps.PlayerID = playerID
	return ps, nil
}

// GetTopScorersByTournament returns top scorers for a tournament using the SQL function.
func (r *PGRepository) GetTopScorersByTournament(ctx context.Context, tournamentID uuid.UUID, limit int) ([]TopScorersRow, error) {
	// The tournament must exist (404 otherwise)
	const getLeagueQ = `SELECT league_id FROM public.tournaments WHERE id = $1`
	var leagueID uuid.UUID
	if err := r.db.QueryRow(ctx, getLeagueQ, tournamentID).Scan(&leagueID); err != nil {
		if database.IsNoRows(err) {
			return nil, httpx.ErrNotFound
		}
		return nil, fmt.Errorf("get league for tournament: %w", err)
	}

	// Call SQL function
	const q = `SELECT player_id, player_name, jersey_number, "position", photo,
	                 team_id, team_name, matches_played, goals, assists,
	                 yellow_cards, red_cards, minutes_played
	          FROM public.get_top_scorers_by_tournament($1, $2)`

	rows, err := r.db.Query(ctx, q, tournamentID, limit)
	if err != nil {
		return nil, fmt.Errorf("get top scorers: %w", err)
	}
	defer rows.Close()

	var scorers []TopScorersRow
	for rows.Next() {
		var s TopScorersRow
		if err := rows.Scan(
			&s.PlayerID, &s.PlayerName, &s.JerseyNumber, &s.Position, &s.Photo,
			&s.TeamID, &s.TeamName, &s.MatchesPlayed, &s.Goals, &s.Assists,
			&s.YellowCards, &s.RedCards, &s.MinutesPlayed,
		); err != nil {
			return nil, fmt.Errorf("scan top scorer: %w", err)
		}
		scorers = append(scorers, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("top scorers rows: %w", err)
	}
	return scorers, nil
}

// GetDisciplineByTournament returns discipline ranking for a tournament using the SQL function.
func (r *PGRepository) GetDisciplineByTournament(ctx context.Context, tournamentID uuid.UUID, limit int) ([]DisciplineRow, error) {
	// The tournament must exist (404 otherwise)
	const getLeagueQ = `SELECT league_id FROM public.tournaments WHERE id = $1`
	var leagueID uuid.UUID
	if err := r.db.QueryRow(ctx, getLeagueQ, tournamentID).Scan(&leagueID); err != nil {
		if database.IsNoRows(err) {
			return nil, httpx.ErrNotFound
		}
		return nil, fmt.Errorf("get league for tournament: %w", err)
	}

	// Call SQL function
	const q = `SELECT player_id, player_name, jersey_number, "position", photo,
	                 team_id, team_name, matches_played, goals, assists,
	                 yellow_cards, red_cards, minutes_played
	          FROM public.get_discipline_by_tournament($1, $2)`

	rows, err := r.db.Query(ctx, q, tournamentID, limit)
	if err != nil {
		return nil, fmt.Errorf("get discipline: %w", err)
	}
	defer rows.Close()

	var discipline []DisciplineRow
	for rows.Next() {
		var d DisciplineRow
		if err := rows.Scan(
			&d.PlayerID, &d.PlayerName, &d.JerseyNumber, &d.Position, &d.Photo,
			&d.TeamID, &d.TeamName, &d.MatchesPlayed, &d.Goals, &d.Assists,
			&d.YellowCards, &d.RedCards, &d.MinutesPlayed,
		); err != nil {
			return nil, fmt.Errorf("scan discipline: %w", err)
		}
		discipline = append(discipline, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("discipline rows: %w", err)
	}
	return discipline, nil
}

// GetPlayerStatsByTeam returns all player stats for a team.
func (r *PGRepository) GetPlayerStatsByTeam(ctx context.Context, teamID uuid.UUID, tournamentID *uuid.UUID) ([]PlayerStats, error) {
	const q = `
		SELECT
			p.id, p.name, p.jersey_number, p.position, p.photo,
			p.team_id, t.name,
			COUNT(ps.id) AS matches_played,
			COALESCE(SUM(ps.goals), 0) AS goals,
			COALESCE(SUM(ps.assists), 0) AS assists,
			COALESCE(SUM(ps.yellow_cards), 0) AS yellow_cards,
			COALESCE(SUM(ps.red_cards), 0) AS red_cards,
			COALESCE(SUM(ps.minutes_played), 0) AS minutes_played
		FROM public.players p
		LEFT JOIN public.player_stats ps ON ps.player_id = p.id
		JOIN public.teams t ON p.team_id = t.id
		WHERE p.team_id = $1
		GROUP BY p.id, p.name, p.jersey_number, p.position, p.photo, p.team_id, t.name
		ORDER BY p.name`

	rows, err := r.db.Query(ctx, q, teamID)
	if err != nil {
		return nil, fmt.Errorf("get team player stats: %w", err)
	}
	defer rows.Close()

	var stats []PlayerStats
	for rows.Next() {
		var ps PlayerStats
		if err := rows.Scan(
			&ps.ID, &ps.PlayerName, &ps.JerseyNumber, &ps.Position, &ps.Photo,
			&ps.TeamID, &ps.TeamName,
			&ps.MatchesPlayed, &ps.Goals, &ps.Assists, &ps.YellowCards, &ps.RedCards, &ps.MinutesPlayed,
		); err != nil {
			return nil, fmt.Errorf("scan player stat: %w", err)
		}
		ps.PlayerID = ps.ID
		stats = append(stats, ps)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("team player stats rows: %w", err)
	}
	return stats, nil
}

// GetSuspensionByID returns a specific suspension.
func (r *PGRepository) GetSuspensionByID(ctx context.Context, suspensionID uuid.UUID) (Suspension, error) {
	const q = `
		SELECT id, player_id, team_id, league_id, tournament_id, suspension_type, reason,
		       matches_to_serve, matches_served, status, notes, start_date, end_date,
		       created_by, updated_by, created_at, updated_at
		FROM public.player_suspensions
		WHERE id = $1`

	var s Suspension
	err := r.db.QueryRow(ctx, q, suspensionID).Scan(
		&s.ID, &s.PlayerID, &s.TeamID, &s.LeagueID, &s.TournamentID, &s.SuspensionType, &s.Reason,
		&s.MatchesToServe, &s.MatchesServed, &s.Status, &s.Notes, &s.StartDate, &s.EndDate,
		&s.CreatedBy, &s.UpdatedBy, &s.CreatedAt, &s.UpdatedAt,
	)
	if database.IsNoRows(err) {
		return Suspension{}, httpx.ErrNotFound
	}
	if err != nil {
		return Suspension{}, fmt.Errorf("get suspension: %w", err)
	}
	return s, nil
}

// GetSuspensionsByLeague returns all suspensions for a league.
func (r *PGRepository) GetSuspensionsByLeague(ctx context.Context, leagueID uuid.UUID) ([]Suspension, error) {
	const q = `
		SELECT id, player_id, team_id, league_id, tournament_id, suspension_type, reason,
		       matches_to_serve, matches_served, status, notes, start_date, end_date,
		       created_by, updated_by, created_at, updated_at
		FROM public.player_suspensions
		WHERE league_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, q, leagueID)
	if err != nil {
		return nil, fmt.Errorf("get league suspensions: %w", err)
	}
	defer rows.Close()

	var suspensions []Suspension
	for rows.Next() {
		var s Suspension
		if err := rows.Scan(
			&s.ID, &s.PlayerID, &s.TeamID, &s.LeagueID, &s.TournamentID, &s.SuspensionType, &s.Reason,
			&s.MatchesToServe, &s.MatchesServed, &s.Status, &s.Notes, &s.StartDate, &s.EndDate,
			&s.CreatedBy, &s.UpdatedBy, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan suspension: %w", err)
		}
		suspensions = append(suspensions, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("league suspensions rows: %w", err)
	}
	if err := r.attachSuspensionNames(ctx, suspensions); err != nil {
		return nil, err
	}
	return suspensions, nil
}

// GetSuspensionsByTeam returns all suspensions for a team.
func (r *PGRepository) GetSuspensionsByTeam(ctx context.Context, teamID uuid.UUID) ([]Suspension, error) {
	const q = `
		SELECT id, player_id, team_id, league_id, tournament_id, suspension_type, reason,
		       matches_to_serve, matches_served, status, notes, start_date, end_date,
		       created_by, updated_by, created_at, updated_at
		FROM public.player_suspensions
		WHERE team_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, q, teamID)
	if err != nil {
		return nil, fmt.Errorf("get team suspensions: %w", err)
	}
	defer rows.Close()

	var suspensions []Suspension
	for rows.Next() {
		var s Suspension
		if err := rows.Scan(
			&s.ID, &s.PlayerID, &s.TeamID, &s.LeagueID, &s.TournamentID, &s.SuspensionType, &s.Reason,
			&s.MatchesToServe, &s.MatchesServed, &s.Status, &s.Notes, &s.StartDate, &s.EndDate,
			&s.CreatedBy, &s.UpdatedBy, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan suspension: %w", err)
		}
		suspensions = append(suspensions, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("team suspensions rows: %w", err)
	}
	if err := r.attachSuspensionNames(ctx, suspensions); err != nil {
		return nil, err
	}
	return suspensions, nil
}

// CreateSuspension creates a new player suspension.
func (r *PGRepository) CreateSuspension(ctx context.Context, leagueID uuid.UUID, req *CreateSuspensionRequest) (Suspension, error) {
	const q = `
		INSERT INTO public.player_suspensions
		(id, player_id, team_id, league_id, suspension_type, reason, matches_to_serve, status, notes, start_date, created_at, updated_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'active', $7, now(), now(), now())
		RETURNING id, player_id, team_id, league_id, tournament_id, suspension_type, reason,
		         matches_to_serve, matches_served, status, notes, start_date, end_date,
		         created_by, updated_by, created_at, updated_at`

	var s Suspension
	err := r.db.QueryRow(ctx, q,
		req.PlayerID, req.TeamID, leagueID, req.SuspensionType, req.Reason, req.MatchesToServe, req.Notes,
	).Scan(
		&s.ID, &s.PlayerID, &s.TeamID, &s.LeagueID, &s.TournamentID, &s.SuspensionType, &s.Reason,
		&s.MatchesToServe, &s.MatchesServed, &s.Status, &s.Notes, &s.StartDate, &s.EndDate,
		&s.CreatedBy, &s.UpdatedBy, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return Suspension{}, fmt.Errorf("create suspension: %w", err)
	}
	return s, nil
}

// UpdateSuspension updates a suspension.
func (r *PGRepository) UpdateSuspension(ctx context.Context, suspensionID uuid.UUID, req *UpdateSuspensionRequest) (Suspension, error) {
	// Build dynamic update query
	q := `UPDATE public.player_suspensions SET updated_at = now()`
	var args []any
	argNum := 1

	if req.MatchesToServe != nil {
		q += fmt.Sprintf(`, matches_to_serve = $%d`, argNum)
		args = append(args, *req.MatchesToServe)
		argNum++
	}
	if req.Notes != nil {
		q += fmt.Sprintf(`, notes = $%d`, argNum)
		args = append(args, *req.Notes)
		argNum++
	}

	q += fmt.Sprintf(` WHERE id = $%d`, argNum)
	args = append(args, suspensionID)

	// Fetch and return updated record
	if _, err := r.db.Exec(ctx, q, args...); err != nil {
		return Suspension{}, fmt.Errorf("update suspension: %w", err)
	}

	return r.GetSuspensionByID(ctx, suspensionID)
}

// CancelSuspension cancels a suspension.
func (r *PGRepository) CancelSuspension(ctx context.Context, suspensionID uuid.UUID) (Suspension, error) {
	const q = `
		UPDATE public.player_suspensions
		SET status = 'cancelled', end_date = now(), updated_at = now()
		WHERE id = $1`

	if _, err := r.db.Exec(ctx, q, suspensionID); err != nil {
		return Suspension{}, fmt.Errorf("cancel suspension: %w", err)
	}

	return r.GetSuspensionByID(ctx, suspensionID)
}

// CompleteSuspension marks a suspension as completed.
func (r *PGRepository) CompleteSuspension(ctx context.Context, suspensionID uuid.UUID) (Suspension, error) {
	const q = `
		UPDATE public.player_suspensions
		SET status = 'completed', end_date = now(), updated_at = now()
		WHERE id = $1`

	if _, err := r.db.Exec(ctx, q, suspensionID); err != nil {
		return Suspension{}, fmt.Errorf("complete suspension: %w", err)
	}

	return r.GetSuspensionByID(ctx, suspensionID)
}

// ApplySuspensionToMatch applies a suspension to a match.
func (r *PGRepository) ApplySuspensionToMatch(ctx context.Context, suspensionID uuid.UUID, matchID uuid.UUID) error {
	const q = `
		INSERT INTO public.suspension_match_applications (id, suspension_id, match_id, applied_at)
		VALUES (gen_random_uuid(), $1, $2, now())
		ON CONFLICT DO NOTHING`

	if _, err := r.db.Exec(ctx, q, suspensionID, matchID); err != nil {
		return fmt.Errorf("apply suspension to match: %w", err)
	}
	return nil
}

// GetPlayerTeamLeague returns player's team and league for authorization checks (IDOR prevention).
func (r *PGRepository) GetPlayerTeamLeague(ctx context.Context, playerID uuid.UUID) (PlayerTeamLeague, error) {
	const q = `
		SELECT p.id, p.team_id, t.league_id
		FROM public.players p
		JOIN public.teams t ON p.team_id = t.id
		WHERE p.id = $1`

	var ptl PlayerTeamLeague
	err := r.db.QueryRow(ctx, q, playerID).Scan(&ptl.PlayerID, &ptl.TeamID, &ptl.LeagueID)
	if database.IsNoRows(err) {
		return PlayerTeamLeague{}, httpx.ErrNotFound
	}
	if err != nil {
		return PlayerTeamLeague{}, fmt.Errorf("get player team league: %w", err)
	}
	return ptl, nil
}

// GetMatchWithTeams returns match's home and away team IDs for authorization checks.
func (r *PGRepository) GetMatchWithTeams(ctx context.Context, matchID uuid.UUID) (MatchWithTeams, error) {
	const q = `
		SELECT id, home_team_id, away_team_id
		FROM public.matches
		WHERE id = $1`

	var mwt MatchWithTeams
	err := r.db.QueryRow(ctx, q, matchID).Scan(&mwt.MatchID, &mwt.HomeTeamID, &mwt.AwayTeamID)
	if database.IsNoRows(err) {
		return MatchWithTeams{}, httpx.ErrNotFound
	}
	if err != nil {
		return MatchWithTeams{}, fmt.Errorf("get match with teams: %w", err)
	}
	return mwt, nil
}

// visibilityQueries resolve a resource to its league's is_active flag.
var visibilityQueries = map[Scope]string{
	ScopeTournament: `SELECT l.is_active FROM public.tournaments t JOIN public.leagues l ON l.id = t.league_id WHERE t.id = $1`,
	ScopeTeam:       `SELECT l.is_active AND tm.is_active FROM public.teams tm JOIN public.leagues l ON l.id = tm.league_id WHERE tm.id = $1`,
	ScopePlayer:     `SELECT l.is_active AND tm.is_active AND p.is_active FROM public.players p JOIN public.teams tm ON tm.id = p.team_id JOIN public.leagues l ON l.id = tm.league_id WHERE p.id = $1`,
}

// IsPubliclyVisible implements Repository. Missing resources are not visible.
func (r *PGRepository) IsPubliclyVisible(ctx context.Context, scope Scope, id uuid.UUID) (bool, error) {
	q, ok := visibilityQueries[scope]
	if !ok {
		return false, fmt.Errorf("unknown visibility scope %q", scope)
	}
	var visible *bool
	err := r.db.QueryRow(ctx, q, id).Scan(&visible)
	if database.IsNoRows(err) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("check visibility: %w", err)
	}
	return visible != nil && *visible, nil
}

// attachSuspensionNames fills player and team names with one query.
func (r *PGRepository) attachSuspensionNames(ctx context.Context, list []Suspension) error {
	if len(list) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, len(list))
	for i, s := range list {
		ids[i] = s.ID
	}
	rows, err := r.db.Query(ctx, `
		SELECT ps.id, p.name, p.jersey_number, t.name
		FROM public.player_suspensions ps
		JOIN public.players p ON p.id = ps.player_id
		JOIN public.teams t ON t.id = ps.team_id
		WHERE ps.id = ANY($1)`, ids)
	if err != nil {
		return fmt.Errorf("suspension names: %w", err)
	}
	defer rows.Close()
	idx := make(map[uuid.UUID]int, len(list))
	for i, s := range list {
		idx[s.ID] = i
	}
	for rows.Next() {
		var id uuid.UUID
		var player, team string
		var jersey int
		if err := rows.Scan(&id, &player, &jersey, &team); err != nil {
			return fmt.Errorf("scan suspension names: %w", err)
		}
		if i, ok := idx[id]; ok {
			list[i].PlayerName, list[i].PlayerJersey, list[i].TeamName = player, jersey, team
		}
	}
	return rows.Err()
}
