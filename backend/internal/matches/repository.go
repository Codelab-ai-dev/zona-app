package matches

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// PGRepository implements Repository with PostgreSQL.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository builds a PostgreSQL-backed repository.
func NewPGRepository(db database.Querier) *PGRepository {
	return &PGRepository{db: db}
}

// GetMatchByID retrieves a match by ID.
func (r *PGRepository) GetMatchByID(ctx context.Context, matchID uuid.UUID) (Match, error) {
	const q = `
		SELECT id, tournament_id, home_team_id, away_team_id, home_score, away_score,
		       match_date, match_time, status, round, field_number, phase, playoff_round,
		       playoff_position, leg, bye_team_id, is_published, created_at, updated_at
		FROM public.matches
		WHERE id = $1`

	var m Match
	var phase string
	var playoffRound *string
	var leg *string
	err := r.db.QueryRow(ctx, q, matchID).Scan(
		&m.ID, &m.TournamentID, &m.HomeTeamID, &m.AwayTeamID, &m.HomeScore, &m.AwayScore,
		&m.MatchDate, &m.MatchTime, &m.Status, &m.Round, &m.FieldNumber, &phase, &playoffRound,
		&m.PlayoffPosition, &leg, &m.ByeTeamID, &m.IsPublished, &m.CreatedAt, &m.UpdatedAt,
	)
	if database.IsNoRows(err) {
		return Match{}, httpx.ErrNotFound
	}
	if err != nil {
		return Match{}, fmt.Errorf("get match %s: %w", matchID, err)
	}

	m.Phase = Phase(phase)
	if playoffRound != nil {
		pr := PlayoffRound(*playoffRound)
		m.PlayoffRound = &pr
	}
	if leg != nil {
		l := Leg(*leg)
		m.Leg = &l
	}

	one := []Match{m}
	if err := r.attachTeams(ctx, one); err != nil {
		return Match{}, err
	}
	return one[0], nil
}

// GetMatchWithRelations retrieves a match with related teams, goals, cards, and incidents.
func (r *PGRepository) GetMatchWithRelations(ctx context.Context, matchID uuid.UUID) (MatchWithRelations, error) {
	m, err := r.GetMatchByID(ctx, matchID)
	if err != nil {
		return MatchWithRelations{}, err
	}

	mwr := MatchWithRelations{Match: m}

	// Fetch home team
	const teamQ = `
		SELECT id, name, slug, COALESCE(logo, '') FROM public.teams WHERE id = $1`
	var homeTeam Team
	if err := r.db.QueryRow(ctx, teamQ, m.HomeTeamID).Scan(&homeTeam.ID, &homeTeam.Name, &homeTeam.Slug, &homeTeam.Logo); err == nil {
		mwr.HomeTeam = &homeTeam
	}

	// Fetch away team
	var awayTeam Team
	if err := r.db.QueryRow(ctx, teamQ, m.AwayTeamID).Scan(&awayTeam.ID, &awayTeam.Name, &awayTeam.Slug, &awayTeam.Logo); err == nil {
		mwr.AwayTeam = &awayTeam
	}

	// Fetch goals
	const goalsQ = `
		SELECT id, match_id, player_id, team_id, minute, goal_type, assist_player_id, description, created_at
		FROM public.match_goals
		WHERE match_id = $1
		ORDER BY minute ASC`
	rows, err := r.db.Query(ctx, goalsQ, matchID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var g Goal
			var goalType string
			if err := rows.Scan(&g.ID, &g.MatchID, &g.PlayerID, &g.TeamID, &g.Minute, &goalType,
				&g.AssistPlayerID, &g.Description, &g.CreatedAt); err == nil {
				g.GoalType = GoalType(goalType)
				mwr.Goals = append(mwr.Goals, g)
			}
		}
	}

	// Fetch cards
	const cardsQ = `
		SELECT id, match_id, player_id, team_id, card_type, minute, reason, created_at
		FROM public.match_cards
		WHERE match_id = $1
		ORDER BY minute ASC`
	rows, err = r.db.Query(ctx, cardsQ, matchID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var c Card
			var cardType string
			if err := rows.Scan(&c.ID, &c.MatchID, &c.PlayerID, &c.TeamID, &cardType, &c.Minute,
				&c.Reason, &c.CreatedAt); err == nil {
				c.CardType = CardType(cardType)
				mwr.Cards = append(mwr.Cards, c)
			}
		}
	}

	// Fetch incidents
	const incidentsQ = `
		SELECT id, match_id, incident_type, description, minute, player_id, team_id, created_at
		FROM public.match_incidents
		WHERE match_id = $1
		ORDER BY minute ASC NULLS LAST`
	rows, err = r.db.Query(ctx, incidentsQ, matchID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var inc Incident
			if err := rows.Scan(&inc.ID, &inc.MatchID, &inc.IncidentType, &inc.Description, &inc.Minute,
				&inc.PlayerID, &inc.TeamID, &inc.CreatedAt); err == nil {
				mwr.Incidents = append(mwr.Incidents, inc)
			}
		}
	}

	return mwr, nil
}

// ListMatchesByTournament lists matches for a tournament with optional filters.
func (r *PGRepository) ListMatchesByTournament(ctx context.Context, tournamentID uuid.UUID, filters ListMatchesFilter) ([]Match, error) {
	if filters.Limit == 0 {
		filters.Limit = 200
	}
	if filters.Limit > 200 {
		filters.Limit = 200
	}

	q := `
		SELECT id, tournament_id, home_team_id, away_team_id, home_score, away_score,
		       match_date, match_time, status, round, field_number, phase, playoff_round,
		       playoff_position, leg, bye_team_id, is_published, created_at, updated_at
		FROM public.matches
		WHERE tournament_id = $1`

	args := []interface{}{tournamentID}
	argIdx := 2

	if filters.Status != nil {
		q += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, string(*filters.Status))
		argIdx++
	}

	if filters.Round != nil {
		q += fmt.Sprintf(" AND round = $%d", argIdx)
		args = append(args, *filters.Round)
		argIdx++
	}

	if filters.StartDate != nil {
		q += fmt.Sprintf(" AND match_date >= $%d", argIdx)
		args = append(args, *filters.StartDate)
		argIdx++
	}

	if filters.EndDate != nil {
		q += fmt.Sprintf(" AND match_date <= $%d", argIdx)
		args = append(args, *filters.EndDate)
		argIdx++
	}

	q += ` ORDER BY round, match_date`
	q += fmt.Sprintf(` LIMIT %d OFFSET %d`, filters.Limit, filters.Offset)

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query matches by tournament: %w", err)
	}
	defer rows.Close()

	var matches []Match
	for rows.Next() {
		var m Match
		var phase string
		var playoffRound *string
		var leg *string
		if err := rows.Scan(&m.ID, &m.TournamentID, &m.HomeTeamID, &m.AwayTeamID, &m.HomeScore, &m.AwayScore,
			&m.MatchDate, &m.MatchTime, &m.Status, &m.Round, &m.FieldNumber, &phase, &playoffRound,
			&m.PlayoffPosition, &leg, &m.ByeTeamID, &m.IsPublished, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan match: %w", err)
		}
		m.Phase = Phase(phase)
		if playoffRound != nil {
			pr := PlayoffRound(*playoffRound)
			m.PlayoffRound = &pr
		}
		if leg != nil {
			l := Leg(*leg)
			m.Leg = &l
		}
		matches = append(matches, m)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate matches: %w", err)
	}
	if err := r.attachTeams(ctx, matches); err != nil {
		return nil, err
	}
	return matches, nil
}

// ListMatchesByTeam lists matches for a team.
func (r *PGRepository) ListMatchesByTeam(ctx context.Context, teamID uuid.UUID, filters ListMatchesFilter) ([]Match, error) {
	if filters.Limit == 0 {
		filters.Limit = 50
	}
	if filters.Limit > 200 {
		filters.Limit = 200
	}

	q := `
		SELECT id, tournament_id, home_team_id, away_team_id, home_score, away_score,
		       match_date, match_time, status, round, field_number, phase, playoff_round,
		       playoff_position, leg, bye_team_id, is_published, created_at, updated_at
		FROM public.matches
		WHERE home_team_id = $1 OR away_team_id = $1`

	args := []interface{}{teamID}
	argIdx := 2

	if filters.Status != nil {
		q += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, string(*filters.Status))
		argIdx++
	}

	if filters.StartDate != nil {
		q += fmt.Sprintf(" AND match_date >= $%d", argIdx)
		args = append(args, *filters.StartDate)
		argIdx++
	}

	if filters.EndDate != nil {
		q += fmt.Sprintf(" AND match_date <= $%d", argIdx)
		args = append(args, *filters.EndDate)
		argIdx++
	}

	q += ` ORDER BY match_date DESC`
	q += fmt.Sprintf(` LIMIT %d OFFSET %d`, filters.Limit, filters.Offset)

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query matches by team: %w", err)
	}
	defer rows.Close()

	var matches []Match
	for rows.Next() {
		var m Match
		var phase string
		var playoffRound *string
		var leg *string
		if err := rows.Scan(&m.ID, &m.TournamentID, &m.HomeTeamID, &m.AwayTeamID, &m.HomeScore, &m.AwayScore,
			&m.MatchDate, &m.MatchTime, &m.Status, &m.Round, &m.FieldNumber, &phase, &playoffRound,
			&m.PlayoffPosition, &leg, &m.ByeTeamID, &m.IsPublished, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan match: %w", err)
		}
		m.Phase = Phase(phase)
		if playoffRound != nil {
			pr := PlayoffRound(*playoffRound)
			m.PlayoffRound = &pr
		}
		if leg != nil {
			l := Leg(*leg)
			m.Leg = &l
		}
		matches = append(matches, m)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate matches: %w", err)
	}
	if err := r.attachTeams(ctx, matches); err != nil {
		return nil, err
	}
	return matches, nil
}

// ListUpcomingMatches lists upcoming matches for a tournament.
func (r *PGRepository) ListUpcomingMatches(ctx context.Context, tournamentID uuid.UUID, limit int) ([]Match, error) {
	if limit == 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	now := time.Now()
	const q = `
		SELECT id, tournament_id, home_team_id, away_team_id, home_score, away_score,
		       match_date, match_time, status, round, field_number, phase, playoff_round,
		       playoff_position, leg, bye_team_id, is_published, created_at, updated_at
		FROM public.matches
		WHERE tournament_id = $1 AND status = 'scheduled' AND match_date >= $2
		ORDER BY match_date ASC
		LIMIT $3`

	rows, err := r.db.Query(ctx, q, tournamentID, now, limit)
	if err != nil {
		return nil, fmt.Errorf("query upcoming matches: %w", err)
	}
	defer rows.Close()

	var matches []Match
	for rows.Next() {
		var m Match
		var phase string
		var playoffRound *string
		var leg *string
		if err := rows.Scan(&m.ID, &m.TournamentID, &m.HomeTeamID, &m.AwayTeamID, &m.HomeScore, &m.AwayScore,
			&m.MatchDate, &m.MatchTime, &m.Status, &m.Round, &m.FieldNumber, &phase, &playoffRound,
			&m.PlayoffPosition, &leg, &m.ByeTeamID, &m.IsPublished, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan match: %w", err)
		}
		m.Phase = Phase(phase)
		if playoffRound != nil {
			pr := PlayoffRound(*playoffRound)
			m.PlayoffRound = &pr
		}
		if leg != nil {
			l := Leg(*leg)
			m.Leg = &l
		}
		matches = append(matches, m)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate matches: %w", err)
	}
	if err := r.attachTeams(ctx, matches); err != nil {
		return nil, err
	}
	return matches, nil
}

// ListPendingMatchesByLeague lists pending matches (scheduled/in_progress) for a league.
func (r *PGRepository) ListPendingMatchesByLeague(ctx context.Context, leagueID uuid.UUID, limit int) ([]Match, error) {
	if limit == 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	const q = `
		SELECT m.id, m.tournament_id, m.home_team_id, m.away_team_id, m.home_score, m.away_score,
		       m.match_date, m.match_time, m.status, m.round, m.field_number, m.phase, m.playoff_round,
		       m.playoff_position, m.leg, m.bye_team_id, m.is_published, m.created_at, m.updated_at
		FROM public.matches m
		JOIN public.tournaments t ON t.id = m.tournament_id
		WHERE t.league_id = $1 AND m.status IN ('scheduled', 'in_progress')
		ORDER BY m.match_date, m.match_time
		LIMIT $2`

	rows, err := r.db.Query(ctx, q, leagueID, limit)
	if err != nil {
		return nil, fmt.Errorf("query pending matches by league: %w", err)
	}
	defer rows.Close()

	var matches []Match
	for rows.Next() {
		var m Match
		var phase string
		var playoffRound *string
		var leg *string
		if err := rows.Scan(&m.ID, &m.TournamentID, &m.HomeTeamID, &m.AwayTeamID, &m.HomeScore, &m.AwayScore,
			&m.MatchDate, &m.MatchTime, &m.Status, &m.Round, &m.FieldNumber, &phase, &playoffRound,
			&m.PlayoffPosition, &leg, &m.ByeTeamID, &m.IsPublished, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan match: %w", err)
		}
		m.Phase = Phase(phase)
		if playoffRound != nil {
			pr := PlayoffRound(*playoffRound)
			m.PlayoffRound = &pr
		}
		if leg != nil {
			l := Leg(*leg)
			m.Leg = &l
		}
		matches = append(matches, m)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate matches: %w", err)
	}
	if err := r.attachTeams(ctx, matches); err != nil {
		return nil, err
	}
	return matches, nil
}

// FindDuplicateMatches finds teams that play more than once in a tournament.
func (r *PGRepository) FindDuplicateMatches(ctx context.Context, tournamentID uuid.UUID) ([]DuplicateMatchGroup, error) {
	const q = `
		SELECT m.id, m.round, m.match_date, m.home_team_id, m.away_team_id,
		       ht.name, at.name
		FROM public.matches m
		JOIN public.teams ht ON ht.id = m.home_team_id
		JOIN public.teams at ON at.id = m.away_team_id
		WHERE m.tournament_id = $1
		ORDER BY m.round, m.match_date`

	rows, err := r.db.Query(ctx, q, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("find duplicates: %w", err)
	}
	defer rows.Close()

	pairMap := make(map[string][]DuplicateMatch)

	for rows.Next() {
		var matchID uuid.UUID
		var round *int
		var matchDate time.Time
		var homeTeamID, awayTeamID uuid.UUID
		var homeTeamName, awayTeamName string

		if err := rows.Scan(&matchID, &round, &matchDate, &homeTeamID, &awayTeamID,
			&homeTeamName, &awayTeamName); err != nil {
			return nil, fmt.Errorf("scan duplicate: %w", err)
		}

		// Normalize pair key (sorted team IDs)
		var pairKey string
		if homeTeamID.String() < awayTeamID.String() {
			pairKey = homeTeamID.String() + "|" + awayTeamID.String()
		} else {
			pairKey = awayTeamID.String() + "|" + homeTeamID.String()
		}

		dm := DuplicateMatch{
			ID:       matchID,
			Round:    round,
			Date:     matchDate,
			HomeTeam: homeTeamName,
			AwayTeam: awayTeamName,
		}

		pairMap[pairKey] = append(pairMap[pairKey], dm)
	}

	// Build result with only duplicates
	var result []DuplicateMatchGroup
	for _, matches := range pairMap {
		if len(matches) > 1 {
			result = append(result, DuplicateMatchGroup{
				Pair:    matches[0].HomeTeam + " vs " + matches[0].AwayTeam,
				Matches: matches,
			})
		}
	}

	return result, nil
}

// CreateMatch creates a single match.
func (r *PGRepository) CreateMatch(ctx context.Context, req CreateMatchRequest) (Match, error) {
	phase := string(PhaseRegular)
	if req.Phase != nil {
		phase = *req.Phase
	}

	const q = `
		INSERT INTO public.matches (tournament_id, home_team_id, away_team_id, match_date,
		                             match_time, round, field_number, phase, playoff_round,
		                             playoff_position, leg, bye_team_id, status, home_score, away_score)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'scheduled', 0, 0)
		RETURNING id, tournament_id, home_team_id, away_team_id, home_score, away_score,
		          match_date, match_time, status, round, field_number, phase, playoff_round,
		          playoff_position, leg, bye_team_id, is_published, created_at, updated_at`

	var m Match
	var phaseStr string
	var playoffRound *string
	var leg *string
	err := r.db.QueryRow(ctx, q,
		req.TournamentID, req.HomeTeamID, req.AwayTeamID, req.MatchDate,
		req.MatchTime, req.Round, req.FieldNumber, phase, req.PlayoffRound,
		req.PlayoffPosition, req.Leg, req.ByeTeamID,
	).Scan(&m.ID, &m.TournamentID, &m.HomeTeamID, &m.AwayTeamID, &m.HomeScore, &m.AwayScore,
		&m.MatchDate, &m.MatchTime, &m.Status, &m.Round, &m.FieldNumber, &phaseStr, &playoffRound,
		&m.PlayoffPosition, &leg, &m.ByeTeamID, &m.IsPublished, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return Match{}, fmt.Errorf("create match: %w", err)
	}

	m.Phase = Phase(phaseStr)
	if playoffRound != nil {
		pr := PlayoffRound(*playoffRound)
		m.PlayoffRound = &pr
	}
	if leg != nil {
		l := Leg(*leg)
		m.Leg = &l
	}

	return m, nil
}

// CreateMatches creates multiple matches in a single transaction (handled by caller).
func (r *PGRepository) CreateMatches(ctx context.Context, tournamentID uuid.UUID, reqs []CreateMatchRequest) ([]Match, error) {
	var matches []Match
	for _, req := range reqs {
		req.TournamentID = tournamentID
		m, err := r.CreateMatch(ctx, req)
		if err != nil {
			return nil, err
		}
		matches = append(matches, m)
	}
	return matches, nil
}

// UpdateMatchSchedule updates match schedule fields.
func (r *PGRepository) UpdateMatchSchedule(ctx context.Context, matchID uuid.UUID, req UpdateMatchScheduleRequest) (Match, error) {
	// Start with fetch to get existing values
	m, err := r.GetMatchByID(ctx, matchID)
	if err != nil {
		return Match{}, err
	}

	// Update fields if provided
	if req.MatchDate != nil {
		m.MatchDate = *req.MatchDate
	}
	if req.MatchTime != nil {
		m.MatchTime = req.MatchTime
	}
	if req.FieldNumber != nil {
		m.FieldNumber = req.FieldNumber
	}
	if req.Round != nil {
		m.Round = req.Round
	}
	if req.HomeTeamID != nil {
		m.HomeTeamID = *req.HomeTeamID
	}
	if req.AwayTeamID != nil {
		m.AwayTeamID = *req.AwayTeamID
	}

	const q = `
		UPDATE public.matches
		SET match_date = $2, match_time = $3, field_number = $4, round = $5,
		    home_team_id = $6, away_team_id = $7, updated_at = now()
		WHERE id = $1
		RETURNING id, tournament_id, home_team_id, away_team_id, home_score, away_score,
		          match_date, match_time, status, round, field_number, phase, playoff_round,
		          playoff_position, leg, bye_team_id, is_published, created_at, updated_at`

	var phaseStr string
	var playoffRound *string
	var leg *string
	err = r.db.QueryRow(ctx, q, matchID, m.MatchDate, m.MatchTime, m.FieldNumber, m.Round, m.HomeTeamID, m.AwayTeamID).Scan(
		&m.ID, &m.TournamentID, &m.HomeTeamID, &m.AwayTeamID, &m.HomeScore, &m.AwayScore,
		&m.MatchDate, &m.MatchTime, &m.Status, &m.Round, &m.FieldNumber, &phaseStr, &playoffRound,
		&m.PlayoffPosition, &leg, &m.ByeTeamID, &m.IsPublished, &m.CreatedAt, &m.UpdatedAt,
	)
	if database.IsNoRows(err) {
		return Match{}, httpx.ErrNotFound
	}
	if err != nil {
		return Match{}, fmt.Errorf("update match schedule: %w", err)
	}

	m.Phase = Phase(phaseStr)
	if playoffRound != nil {
		pr := PlayoffRound(*playoffRound)
		m.PlayoffRound = &pr
	}
	if leg != nil {
		l := Leg(*leg)
		m.Leg = &l
	}

	return m, nil
}

// DeleteMatch deletes a match (only if scheduled).
func (r *PGRepository) DeleteMatch(ctx context.Context, matchID uuid.UUID) error {
	// Check status first
	const checkQ = `SELECT status FROM public.matches WHERE id = $1`
	var status string
	err := r.db.QueryRow(ctx, checkQ, matchID).Scan(&status)
	if database.IsNoRows(err) {
		return httpx.ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("check match status: %w", err)
	}

	if status != string(MatchStatusScheduled) {
		return httpx.ErrConflict.Wrap(fmt.Errorf("can only delete scheduled matches, this is %s", status))
	}

	const deleteQ = `DELETE FROM public.matches WHERE id = $1`
	_, err = r.db.Exec(ctx, deleteQ, matchID)
	if err != nil {
		return fmt.Errorf("delete match: %w", err)
	}

	return nil
}

// CreateGoal creates a goal record.
func (r *PGRepository) CreateGoal(ctx context.Context, matchID uuid.UUID, req PostGoalRequest) (Goal, error) {
	goalType := string(GoalTypeNormal)
	if req.GoalType != nil {
		goalType = *req.GoalType
	}

	const q = `
		INSERT INTO public.match_goals (match_id, player_id, team_id, minute, goal_type, assist_player_id, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, match_id, player_id, team_id, minute, goal_type, assist_player_id, description, created_at`

	var g Goal
	var gt string
	err := r.db.QueryRow(ctx, q, matchID, req.PlayerID, req.TeamID, req.Minute, goalType, req.AssistPlayerID, req.Description).
		Scan(&g.ID, &g.MatchID, &g.PlayerID, &g.TeamID, &g.Minute, &gt, &g.AssistPlayerID, &g.Description, &g.CreatedAt)
	if err != nil {
		return Goal{}, fmt.Errorf("create goal: %w", err)
	}

	g.GoalType = GoalType(gt)
	return g, nil
}

// CreateCard creates a card record.
func (r *PGRepository) CreateCard(ctx context.Context, matchID uuid.UUID, req PostCardRequest) (Card, error) {
	const q = `
		INSERT INTO public.match_cards (match_id, player_id, team_id, card_type, minute, reason)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, match_id, player_id, team_id, card_type, minute, reason, created_at`

	var c Card
	var ct string
	err := r.db.QueryRow(ctx, q, matchID, req.PlayerID, req.TeamID, req.CardType, req.Minute, req.Reason).
		Scan(&c.ID, &c.MatchID, &c.PlayerID, &c.TeamID, &ct, &c.Minute, &c.Reason, &c.CreatedAt)
	if err != nil {
		return Card{}, fmt.Errorf("create card: %w", err)
	}

	c.CardType = CardType(ct)
	return c, nil
}

// CreateIncident creates an incident record.
func (r *PGRepository) CreateIncident(ctx context.Context, matchID uuid.UUID, req PostIncidentRequest) (Incident, error) {
	const q = `
		INSERT INTO public.match_incidents (match_id, incident_type, description, minute, player_id, team_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, match_id, incident_type, description, minute, player_id, team_id, created_at`

	var inc Incident
	err := r.db.QueryRow(ctx, q, matchID, req.IncidentType, req.Description, req.Minute, req.PlayerID, req.TeamID).
		Scan(&inc.ID, &inc.MatchID, &inc.IncidentType, &inc.Description, &inc.Minute, &inc.PlayerID, &inc.TeamID, &inc.CreatedAt)
	if err != nil {
		return Incident{}, fmt.Errorf("create incident: %w", err)
	}

	return inc, nil
}

// CreateOrUpdateRefereeReport creates or updates a referee report.
func (r *PGRepository) CreateOrUpdateRefereeReport(ctx context.Context, matchID uuid.UUID, req PostRefereeReportRequest) (RefereeReport, error) {
	const q = `
		INSERT INTO public.match_referee_reports (match_id, referee_name, assistant_referee_1, assistant_referee_2,
		                                          fourth_official, general_observations, weather_conditions, field_conditions)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (match_id) DO UPDATE SET
			referee_name = EXCLUDED.referee_name,
			assistant_referee_1 = EXCLUDED.assistant_referee_1,
			assistant_referee_2 = EXCLUDED.assistant_referee_2,
			fourth_official = EXCLUDED.fourth_official,
			general_observations = EXCLUDED.general_observations,
			weather_conditions = EXCLUDED.weather_conditions,
			field_conditions = EXCLUDED.field_conditions,
			updated_at = now()
		RETURNING id, match_id, referee_name, assistant_referee_1, assistant_referee_2, fourth_official,
		          general_observations, weather_conditions, field_conditions, created_at, updated_at`

	var rr RefereeReport
	err := r.db.QueryRow(ctx, q,
		matchID, req.RefereeName, req.AssistantReferee1, req.AssistantReferee2,
		req.FourthOfficial, req.GeneralObservations, req.WeatherConditions, req.FieldConditions,
	).Scan(&rr.ID, &rr.MatchID, &rr.RefereeName, &rr.AssistantReferee1, &rr.AssistantReferee2, &rr.FourthOfficial,
		&rr.GeneralObservations, &rr.WeatherConditions, &rr.FieldConditions, &rr.CreatedAt, &rr.UpdatedAt)
	if err != nil {
		return RefereeReport{}, fmt.Errorf("create or update referee report: %w", err)
	}

	return rr, nil
}

// GetRefereeReport retrieves a referee report for a match.
func (r *PGRepository) GetRefereeReport(ctx context.Context, matchID uuid.UUID) (RefereeReport, error) {
	const q = `
		SELECT id, match_id, referee_name, assistant_referee_1, assistant_referee_2, fourth_official,
		       general_observations, weather_conditions, field_conditions, created_at, updated_at
		FROM public.match_referee_reports
		WHERE match_id = $1`

	var rr RefereeReport
	err := r.db.QueryRow(ctx, q, matchID).Scan(
		&rr.ID, &rr.MatchID, &rr.RefereeName, &rr.AssistantReferee1, &rr.AssistantReferee2, &rr.FourthOfficial,
		&rr.GeneralObservations, &rr.WeatherConditions, &rr.FieldConditions, &rr.CreatedAt, &rr.UpdatedAt,
	)
	if database.IsNoRows(err) {
		return RefereeReport{}, httpx.ErrNotFound
	}
	if err != nil {
		return RefereeReport{}, fmt.Errorf("get referee report: %w", err)
	}

	return rr, nil
}

// PostMatchResult updates match score and status to finished.
func (r *PGRepository) PostMatchResult(ctx context.Context, matchID uuid.UUID, homeScore int, awayScore int) error {
	const q = `
		UPDATE public.matches
		SET home_score = $2, away_score = $3, status = 'finished', updated_at = now()
		WHERE id = $1`

	result, err := r.db.Exec(ctx, q, matchID, homeScore, awayScore)
	if err != nil {
		return fmt.Errorf("update match result: %w", err)
	}

	if result.RowsAffected() == 0 {
		return httpx.ErrNotFound
	}

	return nil
}

// PublishMatch updates the is_published flag for a match.
func (r *PGRepository) PublishMatch(ctx context.Context, matchID uuid.UUID, isPublished bool) error {
	const q = `
		UPDATE public.matches
		SET is_published = $2, updated_at = now()
		WHERE id = $1`

	result, err := r.db.Exec(ctx, q, matchID, isPublished)
	if err != nil {
		return fmt.Errorf("publish match: %w", err)
	}

	if result.RowsAffected() == 0 {
		return httpx.ErrNotFound
	}

	return nil
}

// PublishRound updates the is_published flag for all matches in a tournament round.
func (r *PGRepository) PublishRound(ctx context.Context, tournamentID uuid.UUID, round int, isPublished bool) error {
	const q = `
		UPDATE public.matches
		SET is_published = $3, updated_at = now()
		WHERE tournament_id = $1 AND round = $2`

	result, err := r.db.Exec(ctx, q, tournamentID, round, isPublished)
	if err != nil {
		return fmt.Errorf("publish round: %w", err)
	}

	if result.RowsAffected() == 0 {
		return httpx.ErrNotFound
	}

	return nil
}

// GetTournamentStandings retrieves standings sorted by points + adjustment, goal difference, goals for.
func (r *PGRepository) GetTournamentStandings(ctx context.Context, tournamentID uuid.UUID) ([]StandingsTeam, error) {
	const q = `
		SELECT team_id, points, goal_difference, goals_for, goals_against,
		       matches_played, matches_won, matches_drawn, matches_lost,
		       COALESCE(points_adjustment, 0) as points_adjustment
		FROM public.team_stats
		WHERE tournament_id = $1
		ORDER BY (points + COALESCE(points_adjustment, 0)) DESC,
		         goal_difference DESC,
		         goals_for DESC`

	rows, err := r.db.Query(ctx, q, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("query standings: %w", err)
	}
	defer rows.Close()

	var standings []StandingsTeam
	for rows.Next() {
		var st StandingsTeam
		if err := rows.Scan(&st.TeamID, &st.Points, &st.GoalDifference, &st.GoalsFor, &st.GoalsAgainst,
			&st.MatchesPlayed, &st.MatchesWon, &st.MatchesDrawn, &st.MatchesLost, &st.PointsAdjustment); err != nil {
			return nil, fmt.Errorf("scan standing: %w", err)
		}
		standings = append(standings, st)
	}

	return standings, nil
}

// TournamentLeagueActive implements Repository; missing tournaments are inactive.
func (r *PGRepository) TournamentLeagueActive(ctx context.Context, tournamentID uuid.UUID) (bool, error) {
	var active bool
	err := r.db.QueryRow(ctx, `
		SELECT l.is_active FROM public.tournaments t JOIN public.leagues l ON l.id = t.league_id
		WHERE t.id = $1`, tournamentID).Scan(&active)
	if database.IsNoRows(err) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("tournament league active: %w", err)
	}
	return active, nil
}

// attachTeams fills team names and logos for matches with one query.
func (r *PGRepository) attachTeams(ctx context.Context, matches []Match) error {
	if len(matches) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, 0, 2*len(matches))
	for _, m := range matches {
		ids = append(ids, m.HomeTeamID, m.AwayTeamID)
	}
	rows, err := r.db.Query(ctx, `SELECT id, name, logo FROM public.teams WHERE id = ANY($1)`, ids)
	if err != nil {
		return fmt.Errorf("load match teams: %w", err)
	}
	defer rows.Close()
	type teamRef struct {
		name string
		logo *string
	}
	teams := make(map[uuid.UUID]teamRef, len(ids))
	for rows.Next() {
		var id uuid.UUID
		var t teamRef
		if err := rows.Scan(&id, &t.name, &t.logo); err != nil {
			return fmt.Errorf("scan match team: %w", err)
		}
		teams[id] = t
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate match teams: %w", err)
	}
	for i := range matches {
		h, a := teams[matches[i].HomeTeamID], teams[matches[i].AwayTeamID]
		matches[i].HomeTeamName, matches[i].HomeTeamLogo = h.name, h.logo
		matches[i].AwayTeamName, matches[i].AwayTeamLogo = a.name, a.logo
	}
	return nil
}
