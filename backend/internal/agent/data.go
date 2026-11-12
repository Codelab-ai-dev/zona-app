package agent

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
)

// PGDataProvider implements DataProvider using PostgreSQL.
type PGDataProvider struct {
	db database.Querier
}

// NewPGDataProvider creates a new data provider.
func NewPGDataProvider(db database.Querier) *PGDataProvider {
	return &PGDataProvider{db: db}
}

// Fetch returns SQL context for the given intent, always scoped to the identity's
// league/tournament. It returns plain Spanish text formatted for the LLM,
// capped at ~6000 characters.
func (p *PGDataProvider) Fetch(ctx context.Context, id Identity, c Classification) (string, error) {
	// Intents that don't require SQL return empty string.
	switch c.Intent {
	case IntentRules, IntentPayments, IntentGeneralInfo, IntentConversation, IntentUnknown:
		return "", nil
	}

	// Ensure we have a league scope (non-negotiable security requirement).
	if id.LeagueID == uuid.Nil {
		return "", nil
	}

	// For certain intents, tournament scope is required.
	switch c.Intent {
	case IntentCalendar, IntentResults, IntentNextMatches, IntentStandings, IntentStatistics:
		if id.TournamentID == nil || *id.TournamentID == uuid.Nil {
			return "", nil
		}
	}

	switch c.Intent {
	case IntentCalendar:
		return p.fetchCalendar(ctx, id, c)
	case IntentResults:
		return p.fetchResults(ctx, id, c)
	case IntentStandings:
		return p.fetchStandings(ctx, id, c)
	case IntentSuspensions:
		return p.fetchSuspensions(ctx, id, c)
	case IntentStatistics:
		return p.fetchStatistics(ctx, id, c)
	case IntentNextMatches:
		return p.fetchNextMatches(ctx, id, c)
	}

	return "", nil
}

// fetchCalendar returns matches for a round or today's matches.
func (p *PGDataProvider) fetchCalendar(ctx context.Context, id Identity, c Classification) (string, error) {
	var matches []matchRow
	var err error

	if c.Entities.Round != nil {
		matches, err = p.getJornadaCalendar(ctx, id, *c.Entities.Round)
	} else {
		matches, err = p.getTodayMatches(ctx, id)
	}

	if err != nil {
		return "", err
	}

	if len(matches) == 0 {
		if c.Entities.Round != nil {
			return fmt.Sprintf("No se encontraron partidos para la jornada %d. Es posible que aún no se hayan programado.", *c.Entities.Round), nil
		}
		return "No hay partidos programados para hoy.", nil
	}

	return formatMatchesForLLM(matches), nil
}

// fetchResults returns finished matches.
func (p *PGDataProvider) fetchResults(ctx context.Context, id Identity, c Classification) (string, error) {
	matches, err := p.getMatchResults(ctx, id, c.Entities)
	if err != nil {
		return "", err
	}

	if len(matches) == 0 {
		if c.Entities.Round != nil {
			return fmt.Sprintf("NOTA: Los partidos de la jornada %d aún no tienen marcadores registrados. Los resultados se actualizarán cuando finalicen los partidos.", *c.Entities.Round), nil
		}
		return "NOTA: Aún no hay partidos finalizados con resultados en este torneo. Los resultados se actualizarán conforme terminen los partidos.", nil
	}

	return formatMatchesForLLM(matches), nil
}

// fetchStandings returns the league standings.
func (p *PGDataProvider) fetchStandings(ctx context.Context, id Identity, c Classification) (string, error) {
	standings, err := p.getStandings(ctx, id)
	if err != nil {
		return "", err
	}

	if len(standings) == 0 {
		return "La tabla de posiciones aún no tiene datos. Es posible que no se hayan registrado resultados todavía.", nil
	}

	return formatStandingsForLLM(standings), nil
}

// fetchSuspensions returns suspended players.
func (p *PGDataProvider) fetchSuspensions(ctx context.Context, id Identity, c Classification) (string, error) {
	suspensions, err := p.getSuspendedPlayers(ctx, id)
	if err != nil {
		return "", err
	}

	if len(suspensions) == 0 {
		return "No hay jugadores suspendidos actualmente. ¡Buenas noticias!", nil
	}

	var buf strings.Builder
	buf.WriteString("Jugadores suspendidos:\n")
	for _, s := range suspensions {
		buf.WriteString(fmt.Sprintf("- %s (%s)", s.playerName, s.teamName))
		if s.reason != "" {
			buf.WriteString(fmt.Sprintf(": %s", s.reason))
		}
		buf.WriteString("\n")
	}
	return truncateToChars(buf.String()), nil
}

// fetchStatistics returns top scorers.
func (p *PGDataProvider) fetchStatistics(ctx context.Context, id Identity, c Classification) (string, error) {
	scorers, err := p.getTopScorers(ctx, id, 10)
	if err != nil {
		return "", err
	}

	if len(scorers) == 0 {
		return "Aún no hay estadísticas de goleadores registradas en este torneo.", nil
	}

	return formatScorersForLLM(scorers), nil
}

// fetchNextMatches returns upcoming matches for a team.
func (p *PGDataProvider) fetchNextMatches(ctx context.Context, id Identity, c Classification) (string, error) {
	if c.Entities.TeamName == "" {
		return "Para ver los próximos partidos, dime el nombre del equipo que te interesa.", nil
	}

	matches, err := p.getTeamUpcomingMatches(ctx, id, c.Entities.TeamName, 5)
	if err != nil {
		return "", err
	}

	if len(matches) == 0 {
		return fmt.Sprintf("No encontré próximos partidos para \"%s\". Verifica que el nombre del equipo sea correcto.", c.Entities.TeamName), nil
	}

	return formatMatchesForLLM(matches), nil
}

// --- SQL Query Methods ---

type matchRow struct {
	id        uuid.UUID
	round     *int
	homeTeam  string
	awayTeam  string
	homeScore *int
	awayScore *int
	matchDate time.Time
	matchTime *string
	status    string
	fieldNum  *int
}

type standingRow struct {
	teamName       string
	played         int
	won            int
	drawn          int
	lost           int
	goalsFor       int
	goalsAgainst   int
	goalDifference int
	points         int
}

type suspensionRow struct {
	playerName string
	teamName   string
	reason     string
}

type scorerRow struct {
	playerName string
	teamName   string
	goals      int
	assists    int
}

// getJornadaCalendar returns matches for a specific round.
func (p *PGDataProvider) getJornadaCalendar(ctx context.Context, id Identity, round int) ([]matchRow, error) {
	query := `
		SELECT m.id, m.round, ht.name, at.name, m.home_score, m.away_score,
		       m.match_date, m.match_time, m.status, m.field_number
		FROM matches m
		JOIN teams ht ON m.home_team_id = ht.id
		JOIN teams at ON m.away_team_id = at.id
		JOIN tournaments t ON m.tournament_id = t.id
		WHERE t.league_id = $1
		  AND m.tournament_id = $2
		  AND m.round = $3
		  AND m.is_published = true
		ORDER BY m.match_date ASC, m.match_time ASC
		LIMIT 100
	`
	return p.queryMatches(ctx, query, id.LeagueID, id.TournamentID, round)
}

// getTodayMatches returns today's published matches.
func (p *PGDataProvider) getTodayMatches(ctx context.Context, id Identity) ([]matchRow, error) {
	query := `
		SELECT m.id, m.round, ht.name, at.name, m.home_score, m.away_score,
		       m.match_date, m.match_time, m.status, m.field_number
		FROM matches m
		JOIN teams ht ON m.home_team_id = ht.id
		JOIN teams at ON m.away_team_id = at.id
		JOIN tournaments t ON m.tournament_id = t.id
		WHERE t.league_id = $1
		  AND m.tournament_id = $2
		  AND DATE(m.match_date AT TIME ZONE 'UTC') = DATE(NOW() AT TIME ZONE 'UTC')
		  AND m.is_published = true
		ORDER BY m.match_time ASC, m.match_date ASC
		LIMIT 100
	`
	return p.queryMatches(ctx, query, id.LeagueID, id.TournamentID)
}

// getMatchResults returns finished published matches.
func (p *PGDataProvider) getMatchResults(ctx context.Context, id Identity, entities Entities) ([]matchRow, error) {
	query := `
		SELECT m.id, m.round, ht.name, at.name, m.home_score, m.away_score,
		       m.match_date, m.match_time, m.status, m.field_number
		FROM matches m
		JOIN teams ht ON m.home_team_id = ht.id
		JOIN teams at ON m.away_team_id = at.id
		JOIN tournaments t ON m.tournament_id = t.id
		WHERE t.league_id = $1
		  AND m.tournament_id = $2
		  AND m.status = 'finished'
		  AND m.is_published = true
	`
	args := []any{id.LeagueID, id.TournamentID}

	if entities.Round != nil {
		query += ` AND m.round = $3`
		args = append(args, *entities.Round)
	}

	query += `
		ORDER BY m.match_date DESC, m.match_time DESC
		LIMIT 100
	`

	rows, err := p.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query match results: %w", err)
	}
	defer rows.Close()

	var matches []matchRow
	for rows.Next() {
		var m matchRow
		if err := rows.Scan(&m.id, &m.round, &m.homeTeam, &m.awayTeam, &m.homeScore, &m.awayScore,
			&m.matchDate, &m.matchTime, &m.status, &m.fieldNum); err != nil {
			return nil, fmt.Errorf("scan match: %w", err)
		}
		matches = append(matches, m)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	// Filter by team name if provided (client-side filtering safe from SQL injection).
	if entities.TeamName != "" {
		normalizedTeam := strings.ToLower(entities.TeamName)
		filtered := []matchRow{}
		for _, m := range matches {
			if strings.Contains(strings.ToLower(m.homeTeam), normalizedTeam) ||
				strings.Contains(strings.ToLower(m.awayTeam), normalizedTeam) {
				filtered = append(filtered, m)
			}
		}
		matches = filtered
	}

	return matches, nil
}

// getStandings computes and returns the standings for a tournament.
func (p *PGDataProvider) getStandings(ctx context.Context, id Identity) ([]standingRow, error) {
	// Same source and tie-breakers as the public standings endpoint (stats
	// module) so the assistant never contradicts the website: team_stats,
	// including manual points adjustments.
	const query = `
		SELECT tm.name, ts.matches_played, ts.matches_won, ts.matches_drawn, ts.matches_lost,
		       ts.goals_for, ts.goals_against, ts.goal_difference,
		       ts.points + COALESCE(ts.points_adjustment, 0)
		FROM public.team_stats ts
		JOIN public.teams tm ON tm.id = ts.team_id
		WHERE ts.league_id = $1 AND ts.tournament_id = $2
		ORDER BY ts.points + COALESCE(ts.points_adjustment, 0) DESC, ts.goal_difference DESC, ts.goals_for DESC
		LIMIT 100`
	rows, err := p.db.Query(ctx, query, id.LeagueID, id.TournamentID)
	if err != nil {
		return nil, fmt.Errorf("query standings: %w", err)
	}
	defer rows.Close()

	var out []standingRow
	for rows.Next() {
		var r standingRow
		var played, won, drawn, lost, gf, ga, gd, pts *int
		if err := rows.Scan(&r.teamName, &played, &won, &drawn, &lost, &gf, &ga, &gd, &pts); err != nil {
			return nil, fmt.Errorf("scan standing: %w", err)
		}
		r.played, r.won, r.drawn, r.lost = deref(played), deref(won), deref(drawn), deref(lost)
		r.goalsFor, r.goalsAgainst, r.goalDifference, r.points = deref(gf), deref(ga), deref(gd), deref(pts)
		out = append(out, r)
	}
	return out, rows.Err()
}

func deref(n *int) int {
	if n == nil {
		return 0
	}
	return *n
}

// getSuspendedPlayers returns active suspensions scoped to the league.
func (p *PGDataProvider) getSuspendedPlayers(ctx context.Context, id Identity) ([]suspensionRow, error) {
	query := `
		SELECT DISTINCT p.name, t.name, COALESCE(ps.reason, '')
		FROM player_suspensions ps
		JOIN players p ON ps.player_id = p.id
		JOIN teams t ON ps.team_id = t.id
		WHERE ps.league_id = $1
		  AND ps.status = 'active'
	`
	args := []any{id.LeagueID}

	if id.TournamentID != nil && *id.TournamentID != uuid.Nil {
		query += ` AND ps.tournament_id = $2`
		args = append(args, *id.TournamentID)
	}

	query += `
		ORDER BY p.name ASC
		LIMIT 100
	`

	rows, err := p.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query suspended players: %w", err)
	}
	defer rows.Close()

	var suspensions []suspensionRow
	for rows.Next() {
		var s suspensionRow
		if err := rows.Scan(&s.playerName, &s.teamName, &s.reason); err != nil {
			return nil, fmt.Errorf("scan suspension: %w", err)
		}
		suspensions = append(suspensions, s)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return suspensions, nil
}

// getTopScorers returns the top scorers for a tournament.
func (p *PGDataProvider) getTopScorers(ctx context.Context, id Identity, limit int) ([]scorerRow, error) {
	query := `
		SELECT COALESCE(p.name, 'Unknown'),
		       COALESCE(t.name, 'Unknown'),
		       COUNT(mg.id) as goals,
		       0 as assists
		FROM match_goals mg
		JOIN players p ON mg.player_id = p.id
		JOIN teams t ON p.team_id = t.id
		JOIN matches m ON mg.match_id = m.id
		WHERE m.tournament_id = $1
		  AND m.status = 'finished'
		  AND m.is_published = true
		GROUP BY p.id, p.name, t.id, t.name
		HAVING COUNT(mg.id) > 0
		ORDER BY goals DESC, p.name ASC
		LIMIT $2
	`
	rows, err := p.db.Query(ctx, query, id.TournamentID, limit)
	if err != nil {
		return nil, fmt.Errorf("query top scorers: %w", err)
	}
	defer rows.Close()

	var scorers []scorerRow
	for rows.Next() {
		var s scorerRow
		if err := rows.Scan(&s.playerName, &s.teamName, &s.goals, &s.assists); err != nil {
			return nil, fmt.Errorf("scan scorer: %w", err)
		}
		scorers = append(scorers, s)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return scorers, nil
}

// getTeamUpcomingMatches returns upcoming published matches for a team.
func (p *PGDataProvider) getTeamUpcomingMatches(ctx context.Context, id Identity, teamNameFilter string, limit int) ([]matchRow, error) {
	// First, find the team by name using ILIKE with proper escaping.
	escapedName := escapeILike(teamNameFilter)
	teamQuery := `
		SELECT id FROM teams
		WHERE league_id = $1 AND name ILIKE $2 ESCAPE '\'
		LIMIT 1
	`
	var teamID uuid.UUID
	if err := p.db.QueryRow(ctx, teamQuery, id.LeagueID, escapedName).Scan(&teamID); err != nil {
		if database.IsNoRows(err) {
			return []matchRow{}, nil
		}
		return nil, fmt.Errorf("query team: %w", err)
	}

	// Get upcoming published matches for the team.
	matchQuery := `
		SELECT m.id, m.round, ht.name, at.name, m.home_score, m.away_score,
		       m.match_date, m.match_time, m.status, m.field_number
		FROM matches m
		JOIN teams ht ON m.home_team_id = ht.id
		JOIN teams at ON m.away_team_id = at.id
		WHERE m.tournament_id = $1
		  AND (m.home_team_id = $2 OR m.away_team_id = $2)
		  AND m.status IN ('scheduled', 'in_progress')
		  AND m.is_published = true
		ORDER BY m.match_date ASC, m.match_time ASC
		LIMIT $3
	`
	return p.queryMatches(ctx, matchQuery, id.TournamentID, teamID, limit)
}

// queryMatches is a helper to query matches from the database.
func (p *PGDataProvider) queryMatches(ctx context.Context, query string, args ...any) ([]matchRow, error) {
	rows, err := p.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query matches: %w", err)
	}
	defer rows.Close()

	var matches []matchRow
	for rows.Next() {
		var m matchRow
		if err := rows.Scan(&m.id, &m.round, &m.homeTeam, &m.awayTeam, &m.homeScore, &m.awayScore,
			&m.matchDate, &m.matchTime, &m.status, &m.fieldNum); err != nil {
			return nil, fmt.Errorf("scan match: %w", err)
		}
		matches = append(matches, m)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return matches, nil
}

// --- Formatting Functions ---

// formatMatchesForLLM formats matches as Spanish text for the LLM.
func formatMatchesForLLM(matches []matchRow) string {
	if len(matches) == 0 {
		return "No se encontraron partidos."
	}

	var buf strings.Builder
	for _, m := range matches {
		roundStr := ""
		if m.round != nil {
			roundStr = fmt.Sprintf("Jornada %d: ", *m.round)
		}

		if m.status == "finished" {
			fmt.Fprintf(&buf, "%s%s %d - %d %s (%s)\n",
				roundStr, m.homeTeam, *m.homeScore, *m.awayScore, m.awayTeam,
				m.matchDate.Format("02/01/2006"))
		} else {
			dateStr := m.matchDate.Format("02/01/2006")
			timeStr := ""
			if m.matchTime != nil {
				timeStr = fmt.Sprintf(" a las %s", *m.matchTime)
			}
			fmt.Fprintf(&buf, "%s%s vs %s - %s%s\n",
				roundStr, m.homeTeam, m.awayTeam, dateStr, timeStr)
		}
	}

	return truncateToChars(buf.String())
}

// formatStandingsForLLM formats standings as Spanish text for the LLM.
func formatStandingsForLLM(standings []standingRow) string {
	var buf strings.Builder
	buf.WriteString("TABLA DE POSICIONES:\n\n")

	for i, team := range standings {
		dgStr := fmt.Sprintf("%+d", team.goalDifference)
		if team.goalDifference <= 0 {
			dgStr = fmt.Sprintf("%d", team.goalDifference)
		}
		fmt.Fprintf(&buf, "%d. %s\n   %dpts | %d-%d-%d | GD:%s\n",
			i+1, team.teamName, team.points, team.won, team.drawn, team.lost, dgStr)
	}

	return truncateToChars(buf.String())
}

// formatScorersForLLM formats scorers as Spanish text for the LLM.
func formatScorersForLLM(scorers []scorerRow) string {
	if len(scorers) == 0 {
		return "No hay estadísticas de goleadores disponibles."
	}

	var buf strings.Builder
	buf.WriteString("Tabla de Goleadores:\n\n")

	for i, s := range scorers {
		fmt.Fprintf(&buf, "%d. %s (%s) - %d goles",
			i+1, s.playerName, s.teamName, s.goals)
		if s.assists > 0 {
			fmt.Fprintf(&buf, ", %d asistencias", s.assists)
		}
		buf.WriteString("\n")
	}

	return truncateToChars(buf.String())
}

// --- Helper Functions ---

// escapeILike escapes a string for use in an ILIKE query with ESCAPE '\'.
// Escapes % and _ to \% and \_.
func escapeILike(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "%", "\\%")
	s = strings.ReplaceAll(s, "_", "\\_")
	return "%" + s + "%"
}

// truncateToChars truncates text to ~6000 characters, appending "..." if truncated.
func truncateToChars(text string) string {
	const maxChars = 6000
	if len(text) > maxChars {
		return text[:maxChars-3] + "..."
	}
	return text
}
