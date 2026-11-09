package matches

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service holds business logic and authorization.
type Service struct {
	repo  Repository
	authz authz.Checker
	pool  *pgxpool.Pool
}

// NewService builds the matches service.
func NewService(repo Repository, az authz.Checker, pool *pgxpool.Pool) *Service {
	return &Service{repo: repo, authz: az, pool: pool}
}

// GetMatch retrieves a match with related data by ID (public endpoint).
func (s *Service) GetMatch(ctx context.Context, matchID uuid.UUID) (MatchWithRelations, error) {
	m, err := s.repo.GetMatchWithRelations(ctx, matchID)
	if err != nil {
		return MatchWithRelations{}, err
	}
	visible, err := s.visibleMatches(ctx, []Match{m.Match})
	if err != nil {
		return MatchWithRelations{}, err
	}
	if len(visible) == 0 {
		// Unpublished matches are hidden, not forbidden: don't disclose them.
		return MatchWithRelations{}, httpx.ErrNotFound
	}
	return m, nil
}

// ListMatches lists matches for a tournament (public endpoint, applies visibility).
func (s *Service) ListMatches(ctx context.Context, tournamentID uuid.UUID, filters ListMatchesFilter) ([]Match, error) {
	matches, err := s.repo.ListMatchesByTournament(ctx, tournamentID, filters)
	if err != nil {
		return nil, err
	}
	return s.visibleMatches(ctx, matches)
}

// ListTeamMatches lists matches for a team (public endpoint, applies visibility).
func (s *Service) ListTeamMatches(ctx context.Context, teamID uuid.UUID, filters ListMatchesFilter) ([]Match, error) {
	matches, err := s.repo.ListMatchesByTeam(ctx, teamID, filters)
	if err != nil {
		return nil, err
	}
	return s.visibleMatches(ctx, matches)
}

// ListUpcoming lists upcoming matches for a tournament (public endpoint, applies visibility).
func (s *Service) ListUpcoming(ctx context.Context, tournamentID uuid.UUID, limit int) ([]Match, error) {
	matches, err := s.repo.ListUpcomingMatches(ctx, tournamentID, limit)
	if err != nil {
		return nil, err
	}
	return s.visibleMatches(ctx, matches)
}

// ListPending lists pending matches for a league (public endpoint, applies visibility).
func (s *Service) ListPending(ctx context.Context, leagueID uuid.UUID, limit int) ([]Match, error) {
	matches, err := s.repo.ListPendingMatchesByLeague(ctx, leagueID, limit)
	if err != nil {
		return nil, err
	}
	return s.visibleMatches(ctx, matches)
}

// visibleMatches keeps the matches the caller may see: everything in
// tournaments they manage; otherwise only published matches of active
// leagues (legacy RLS + is_published). Decisions are cached per tournament.
func (s *Service) visibleMatches(ctx context.Context, matches []Match) ([]Match, error) {
	visible := make([]Match, 0, len(matches))
	cache := make(map[uuid.UUID]visibility)
	for _, m := range matches {
		v, ok := cache[m.TournamentID]
		if !ok {
			var err error
			if v, err = s.tournamentVisibility(ctx, m.TournamentID); err != nil {
				return nil, err
			}
			cache[m.TournamentID] = v
		}
		if v.manager || (v.leagueActive && m.IsPublished) {
			visible = append(visible, m)
		}
	}
	return visible, nil
}

type visibility struct {
	manager      bool
	leagueActive bool
}

func (s *Service) tournamentVisibility(ctx context.Context, tournamentID uuid.UUID) (visibility, error) {
	if caller, ok := auth.FromContext(ctx); ok && s.authz.CanManageTournament(ctx, caller, tournamentID) == nil {
		return visibility{manager: true}, nil
	}
	active, err := s.repo.TournamentLeagueActive(ctx, tournamentID)
	if err != nil {
		return visibility{}, err
	}
	return visibility{leagueActive: active}, nil
}

// FindDuplicates finds duplicate matches in a tournament.
func (s *Service) FindDuplicates(ctx context.Context, caller auth.Principal, tournamentID uuid.UUID) ([]DuplicateMatchGroup, error) {
	// Authorize: must be tournament admin (via league)
	if err := s.authz.CanManageTournament(ctx, caller, tournamentID); err != nil {
		return nil, err
	}

	return s.repo.FindDuplicateMatches(ctx, tournamentID)
}

// CreateMatch creates a single match.
func (s *Service) CreateMatch(ctx context.Context, caller auth.Principal, req CreateMatchRequest) (Match, error) {
	if errs := req.Validate(); len(errs) > 0 {
		return Match{}, httpx.Validation(errs)
	}

	// Authorize: must be tournament admin
	if err := s.authz.CanManageTournament(ctx, caller, req.TournamentID); err != nil {
		return Match{}, err
	}

	return s.repo.CreateMatch(ctx, req)
}

// BulkCreateMatches creates multiple matches in one transaction.
func (s *Service) BulkCreateMatches(ctx context.Context, caller auth.Principal, req BulkCreateMatchesRequest) ([]Match, error) {
	if errs := req.Validate(); len(errs) > 0 {
		return nil, httpx.Validation(errs)
	}

	// Authorize: must be tournament admin
	if err := s.authz.CanManageTournament(ctx, caller, req.TournamentID); err != nil {
		return nil, err
	}

	// For each request, ensure tournament_id is set
	for i := range req.Matches {
		req.Matches[i].TournamentID = req.TournamentID
		if errs := req.Matches[i].Validate(); len(errs) > 0 {
			return nil, httpx.Validation(errs)
		}
	}

	var matches []Match
	err := database.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		txRepo := NewPGRepository(tx)
		var err error
		matches, err = txRepo.CreateMatches(ctx, req.TournamentID, req.Matches)
		return err
	})

	return matches, err
}

// GenerateFixtures generates a fixture schedule algorithmically.
func (s *Service) GenerateFixtures(ctx context.Context, caller auth.Principal, req GenerateFixturesRequest) (map[string]interface{}, error) {
	if errs := req.Validate(); len(errs) > 0 {
		return nil, httpx.Validation(errs)
	}

	// Authorize: must be tournament admin
	if err := s.authz.CanManageTournament(ctx, caller, req.TournamentID); err != nil {
		return nil, err
	}

	isDoubleRound := req.IsDoubleRound != nil && *req.IsDoubleRound
	rounds, byes := fixtureRounds(req, isDoubleRound)

	matchesPerRound := make([]int, len(rounds))
	for i, round := range rounds {
		matchesPerRound[i] = len(round.Matches)
	}
	slots, err := ScheduleRounds(*req.Schedule, matchesPerRound)
	if err != nil {
		return nil, httpx.Validation(map[string]string{"schedule": err.Error()})
	}

	// Convert to create requests with their date, time and field.
	var createReqs []CreateMatchRequest
	for ri, round := range rounds {
		for mi, m := range round.Matches {
			slot := slots[ri][mi]
			kickoff, field := slot.Time, slot.Field
			creq := CreateMatchRequest{
				TournamentID: req.TournamentID,
				HomeTeamID:   m.HomeTeamID,
				AwayTeamID:   m.AwayTeamID,
				Round:        &round.Round,
				MatchDate:    slot.Date,
				MatchTime:    &kickoff,
				FieldNumber:  &field,
			}
			// The resting team (odd team count) is recorded on the first match
			// of its round (of its group, in a group stage), like legacy.
			if bye, ok := byes[[2]int{ri, mi}]; ok {
				creq.ByeTeamID = &bye
			}
			createReqs = append(createReqs, creq)
		}
	}

	if req.DryRun {
		return map[string]interface{}{"matches": createReqs, "rounds": len(rounds), "dry_run": true}, nil
	}

	// Save to database in transaction
	var matches []Match
	err = database.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		txRepo := NewPGRepository(tx)
		var err error
		matches, err = txRepo.CreateMatches(ctx, req.TournamentID, createReqs)
		return err
	})

	return map[string]interface{}{
		"matches": matches,
		"rounds":  len(rounds),
	}, err
}

// UpdateSchedule updates match schedule (time, date, field).
func (s *Service) UpdateSchedule(ctx context.Context, caller auth.Principal, matchID uuid.UUID, req UpdateMatchScheduleRequest) (Match, error) {
	if errs := req.Validate(); len(errs) > 0 {
		return Match{}, httpx.Validation(errs)
	}

	// Authorize: must be tournament admin
	if err := s.authz.CanManageMatch(ctx, caller, matchID); err != nil {
		return Match{}, err
	}

	if req.HomeTeamID != nil || req.AwayTeamID != nil {
		if err := s.checkTeamChange(ctx, matchID, req); err != nil {
			return Match{}, err
		}
	}
	return s.repo.UpdateMatchSchedule(ctx, matchID, req)
}

// DeleteMatch deletes a match (only if scheduled).
func (s *Service) DeleteMatch(ctx context.Context, caller auth.Principal, matchID uuid.UUID) error {
	// Authorize: must be tournament admin
	if err := s.authz.CanManageMatch(ctx, caller, matchID); err != nil {
		return err
	}

	return s.repo.DeleteMatch(ctx, matchID)
}

// PostResult records match result (score, goals, cards, incidents) in one transaction.
// Implements idempotency (deletes existing, then inserts) and IDOR protection (verifies player ownership).
func (s *Service) PostResult(ctx context.Context, caller auth.Principal, matchID uuid.UUID, req PostMatchResultRequest) error {
	if errs := req.Validate(); len(errs) > 0 {
		return httpx.Validation(errs)
	}

	// Authorize: must be tournament admin
	if err := s.authz.CanManageMatch(ctx, caller, matchID); err != nil {
		return err
	}

	// Verify match exists
	match, err := s.repo.GetMatchByID(ctx, matchID)
	if err != nil {
		return err
	}

	// Run the whole update in a transaction with user context (for triggers and auth.uid())
	err = database.WithUserTx(ctx, s.pool, caller.UserID, func(tx pgx.Tx) error {
		txRepo := NewPGRepository(tx)

		// IDOR PROTECTION: Verify every player belongs to home or away team via SQL
		for _, g := range req.Goals {
			if err := verifyPlayerBelongsToTeam(ctx, tx, g.PlayerID, g.TeamID, match.HomeTeamID, match.AwayTeamID); err != nil {
				return err
			}
			// Verify assist player if provided
			if g.AssistPlayerID != nil {
				if err := verifyPlayerBelongsToTeam(ctx, tx, *g.AssistPlayerID, g.TeamID, match.HomeTeamID, match.AwayTeamID); err != nil {
					return err
				}
			}
		}

		for _, c := range req.Cards {
			if err := verifyPlayerBelongsToTeam(ctx, tx, c.PlayerID, c.TeamID, match.HomeTeamID, match.AwayTeamID); err != nil {
				return err
			}
		}

		// IDEMPOTENCY: Delete existing goals, cards, incidents for this match (replace semantics)
		if _, err := tx.Exec(ctx, `DELETE FROM public.match_goals WHERE match_id = $1`, matchID); err != nil {
			return fmt.Errorf("delete goals: %w", err)
		}
		// Cards are re-inserted below and the red-card trigger would create a
		// second suspension, so drop the automatic ones from this match first.
		// Suspensions already partly served are kept untouched.
		if _, err := tx.Exec(ctx, `
			DELETE FROM public.player_suspensions
			WHERE match_card_id IN (SELECT id FROM public.match_cards WHERE match_id = $1)
			  AND COALESCE(matches_served, 0) = 0`, matchID); err != nil {
			return fmt.Errorf("delete automatic suspensions: %w", err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM public.match_cards WHERE match_id = $1`, matchID); err != nil {
			return fmt.Errorf("delete cards: %w", err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM public.match_incidents WHERE match_id = $1`, matchID); err != nil {
			return fmt.Errorf("delete incidents: %w", err)
		}

		// Update match result (this triggers DB functions for team_stats, knowledge base, suspensions)
		if err := txRepo.PostMatchResult(ctx, matchID, req.HomeScore, req.AwayScore); err != nil {
			return err
		}

		// Insert new goals
		for _, g := range req.Goals {
			if _, err := txRepo.CreateGoal(ctx, matchID, g); err != nil {
				return err
			}
		}

		// Insert new cards
		for _, c := range req.Cards {
			if _, err := txRepo.CreateCard(ctx, matchID, c); err != nil {
				return err
			}
		}

		// Insert new incidents
		for _, inc := range req.Incidents {
			if _, err := txRepo.CreateIncident(ctx, matchID, inc); err != nil {
				return err
			}
		}

		if req.Observations != nil {
			if _, err := tx.Exec(ctx, `
				INSERT INTO public.match_referee_reports (match_id, general_observations)
				VALUES ($1, $2)
				ON CONFLICT (match_id) DO UPDATE SET general_observations = EXCLUDED.general_observations, updated_at = now()`,
				matchID, strings.TrimSpace(*req.Observations)); err != nil {
				return fmt.Errorf("save observations: %w", err)
			}
		}

		// The stats trigger only fires when a match becomes finished, so a
		// corrected score of a finished match would leave stale standings.
		if _, err := tx.Exec(ctx, `SELECT public.rebuild_team_stats_for_tournament($1)`, match.TournamentID); err != nil {
			return fmt.Errorf("rebuild standings: %w", err)
		}
		return nil
	})
	if err != nil {
		return err
	}

	// Card fines: the SQL function only acts when the league has finance and
	// auto fines enabled, and skips fines already generated. Best effort and
	// outside the result transaction, so a fines problem never loses a result.
	if _, ferr := s.pool.Exec(ctx, `SELECT * FROM public.generate_fines_from_match($1, $2)`, matchID, caller.UserID); ferr != nil {
		slog.ErrorContext(ctx, "automatic fines not generated", "match_id", matchID, "err", ferr)
	}
	return nil
}

// verifyPlayerBelongsToTeam checks that a player belongs to the given team and that team is home or away in the match.
func verifyPlayerBelongsToTeam(ctx context.Context, tx pgx.Tx, playerID uuid.UUID, suppliedTeamID uuid.UUID, homeTeamID uuid.UUID, awayTeamID uuid.UUID) error {
	const q = `
		SELECT p.team_id FROM public.players p
		WHERE p.id = $1 AND p.team_id = $2
		AND $2 IN ($3, $4)`

	var teamID uuid.UUID
	err := tx.QueryRow(ctx, q, playerID, suppliedTeamID, homeTeamID, awayTeamID).Scan(&teamID)
	if database.IsNoRows(err) {
		return httpx.ErrForbidden.Wrap(fmt.Errorf("player %s does not belong to team %s", playerID, suppliedTeamID))
	}
	if err != nil {
		return fmt.Errorf("verify player: %w", err)
	}
	return nil
}

// CreateRefereeReport creates or updates a referee report.
func (s *Service) CreateRefereeReport(ctx context.Context, caller auth.Principal, matchID uuid.UUID, req PostRefereeReportRequest) (RefereeReport, error) {
	// Authorize: must be tournament admin
	if err := s.authz.CanManageMatch(ctx, caller, matchID); err != nil {
		return RefereeReport{}, err
	}

	// Verify match exists
	if _, err := s.repo.GetMatchByID(ctx, matchID); err != nil {
		return RefereeReport{}, err
	}

	return s.repo.CreateOrUpdateRefereeReport(ctx, matchID, req)
}

// GetRefereeReport retrieves a referee report (requires auth: tournament admin or team owner).
func (s *Service) GetRefereeReport(ctx context.Context, caller auth.Principal, matchID uuid.UUID) (RefereeReport, error) {
	// Authorize: must be tournament admin or own one of the teams
	if err := s.authz.CanManageMatch(ctx, caller, matchID); err != nil {
		return RefereeReport{}, err
	}
	return s.repo.GetRefereeReport(ctx, matchID)
}

// FixtureRound represents a round in the generated fixture.
type FixtureRound struct {
	Round     int
	Matches   []FixtureMatch
	ByeTeamID uuid.UUID
}

// FixtureMatch represents a match in generated fixture.
type FixtureMatch struct {
	HomeTeamID uuid.UUID
	AwayTeamID uuid.UUID
}

// PublishMatch updates the is_published flag for a match.
func (s *Service) PublishMatch(ctx context.Context, caller auth.Principal, matchID uuid.UUID, req PublishMatchRequest) error {
	if errs := req.Validate(); len(errs) > 0 {
		return httpx.Validation(errs)
	}

	// Authorize: must be tournament admin
	if err := s.authz.CanManageMatch(ctx, caller, matchID); err != nil {
		return err
	}

	return s.repo.PublishMatch(ctx, matchID, req.IsPublished)
}

// PublishRound updates the is_published flag for all matches in a tournament round.
func (s *Service) PublishRound(ctx context.Context, caller auth.Principal, tournamentID uuid.UUID, round int, req PublishRoundRequest) error {
	if errs := req.Validate(); len(errs) > 0 {
		return httpx.Validation(errs)
	}

	if round <= 0 {
		return httpx.Validation(map[string]string{"round": "debe ser un entero positivo"})
	}

	// Authorize: must be tournament admin
	if err := s.authz.CanManageTournament(ctx, caller, tournamentID); err != nil {
		return err
	}

	return s.repo.PublishRound(ctx, tournamentID, round, req.IsPublished)
}

// GeneratePlayoffs generates playoff matches from current standings.
// Supports 4 or 8 teams, optional third-place match, and optional home-and-away legs.
func (s *Service) GeneratePlayoffs(ctx context.Context, caller auth.Principal, req GeneratePlayoffsRequest) ([]Match, error) {
	if errs := req.Validate(); len(errs) > 0 {
		return nil, httpx.Validation(errs)
	}

	// Authorize: must be tournament admin
	if err := s.authz.CanManageTournament(ctx, caller, req.TournamentID); err != nil {
		return nil, err
	}

	var (
		standings []StandingsTeam
		err       error
	)
	if len(req.TeamIDs) > 0 {
		// Explicit seeding (group qualifiers or manual): teams of the league.
		standings, err = s.seededTeams(ctx, req.TournamentID, req.TeamIDs)
		if err != nil {
			return nil, err
		}
	} else {
		standings, err = s.repo.GetTournamentStandings(ctx, req.TournamentID)
		if err != nil {
			return nil, err
		}
		if len(standings) < req.NumTeams {
			return nil, httpx.Validation(map[string]string{"num_teams": fmt.Sprintf("solo hay %d equipos en los standings", len(standings))})
		}
	}

	// Build playoff bracket
	bracket := NewPlayoffBracketBuilder(standings[:req.NumTeams], req.NumTeams, req.StartDate.Time, req.StartTime,
		req.FieldNumber, req.ThirdPlaceMatch, req.HomeAndAway)
	matches := bracket.Generate()

	// Create matches in transaction
	var created []Match
	err = database.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		txRepo := NewPGRepository(tx)
		var reqs []CreateMatchRequest
		for _, m := range matches {
			creq := CreateMatchRequest{
				TournamentID:    req.TournamentID,
				HomeTeamID:      m.HomeTeamID,
				AwayTeamID:      m.AwayTeamID,
				MatchDate:       m.MatchDate,
				MatchTime:       m.MatchTime,
				FieldNumber:     m.FieldNumber,
				Phase:           ptrStr(string(PhasePlayoffs)),
				PlayoffRound:    ptrStr(string(*m.PlayoffRound)),
				PlayoffPosition: m.PlayoffPosition,
				Leg:             ptrStrFromLeg(m.Leg),
			}
			reqs = append(reqs, creq)
		}
		var txErr error
		created, txErr = txRepo.CreateMatches(ctx, req.TournamentID, reqs)
		return txErr
	})

	return created, err
}

// PlayoffBracketBuilder generates playoff bracket matches from standings.
type PlayoffBracketBuilder struct {
	standings       []StandingsTeam
	numTeams        int
	startDate       time.Time
	startTime       string
	fieldNumber     int
	thirdPlaceMatch bool
	homeAndAway     bool
}

// NewPlayoffBracketBuilder creates a playoff bracket builder.
func NewPlayoffBracketBuilder(standings []StandingsTeam, numTeams int, startDate time.Time, startTime string,
	fieldNumber int, thirdPlaceMatch bool, homeAndAway bool) *PlayoffBracketBuilder {
	return &PlayoffBracketBuilder{
		standings:       standings,
		numTeams:        numTeams,
		startDate:       startDate,
		startTime:       startTime,
		fieldNumber:     fieldNumber,
		thirdPlaceMatch: thirdPlaceMatch,
		homeAndAway:     homeAndAway,
	}
}

// Generate builds the playoff bracket matches.
func (pb *PlayoffBracketBuilder) Generate() []Match {
	var matches []Match
	startTime, _ := time.Parse("15:04", pb.startTime)

	// Seeding: 1v8, 4v5, 2v7, 3v6 for 8 teams; 1v4, 2v3 for 4 teams
	getMatchDateTime := func(dayOffset int, matchIdx int) (time.Time, *string) {
		matchTime := pb.startDate.AddDate(0, 0, dayOffset)
		matchTime = matchTime.Add(time.Duration(matchIdx) * 90 * time.Minute)
		matchTime = matchTime.
			Add(time.Duration(startTime.Hour()) * time.Hour).
			Add(time.Duration(startTime.Minute()) * time.Minute)
		timeStr := fmt.Sprintf("%02d:%02d", matchTime.Hour(), matchTime.Minute())
		return matchTime, &timeStr
	}

	if pb.numTeams == 8 {
		// Quarterfinals: 1v8, 4v5, 2v7, 3v6
		quarterfinalPairs := [][2]int{{0, 7}, {3, 4}, {1, 6}, {2, 5}}
		for idx, pair := range quarterfinalPairs {
			homeTeamID := pb.standings[pair[0]].TeamID
			awayTeamID := pb.standings[pair[1]].TeamID

			// First leg
			matchDate, matchTime := getMatchDateTime(0, idx)
			position := idx + 1
			leg := (*Leg)(nil)
			if pb.homeAndAway {
				leg = ptrLeg(LegFirst)
			}
			matches = append(matches, Match{
				ID:              uuid.New(),
				TournamentID:    uuid.Nil,
				HomeTeamID:      homeTeamID,
				AwayTeamID:      awayTeamID,
				MatchDate:       matchDate,
				MatchTime:       matchTime,
				FieldNumber:     &pb.fieldNumber,
				Phase:           PhasePlayoffs,
				PlayoffRound:    ptrPlayoffRound(PlayoffRoundQuarterfinals),
				PlayoffPosition: &position,
				Leg:             leg,
				Status:          MatchStatusScheduled,
			})

			// Second leg if home-and-away
			if pb.homeAndAway {
				matchDate2, matchTime2 := getMatchDateTime(3, idx)
				matches = append(matches, Match{
					ID:              uuid.New(),
					TournamentID:    uuid.Nil,
					HomeTeamID:      awayTeamID,
					AwayTeamID:      homeTeamID,
					MatchDate:       matchDate2,
					MatchTime:       matchTime2,
					FieldNumber:     &pb.fieldNumber,
					Phase:           PhasePlayoffs,
					PlayoffRound:    ptrPlayoffRound(PlayoffRoundQuarterfinals),
					PlayoffPosition: &position,
					Leg:             ptrLeg(LegSecond),
					Status:          MatchStatusScheduled,
				})
			}
		}

		// Semifinals (4 teams, TBD from quarterfinals)
		for i := 0; i < 2; i++ {
			// These are placeholders with same team IDs
			homeTeamID := pb.standings[0].TeamID
			awayTeamID := pb.standings[1].TeamID
			matchDate, matchTime := getMatchDateTime(pb.conditionalDays(7, pb.homeAndAway), i)
			position := i + 1
			leg := (*Leg)(nil)
			if pb.homeAndAway {
				leg = ptrLeg(LegFirst)
			}
			matches = append(matches, Match{
				ID:              uuid.New(),
				TournamentID:    uuid.Nil,
				HomeTeamID:      homeTeamID,
				AwayTeamID:      awayTeamID,
				MatchDate:       matchDate,
				MatchTime:       matchTime,
				FieldNumber:     &pb.fieldNumber,
				Phase:           PhasePlayoffs,
				PlayoffRound:    ptrPlayoffRound(PlayoffRoundSemifinals),
				PlayoffPosition: &position,
				Leg:             leg,
				Status:          MatchStatusScheduled,
			})

			if pb.homeAndAway {
				matchDate2, matchTime2 := getMatchDateTime(pb.conditionalDays(10, pb.homeAndAway), i)
				matches = append(matches, Match{
					ID:              uuid.New(),
					TournamentID:    uuid.Nil,
					HomeTeamID:      awayTeamID,
					AwayTeamID:      homeTeamID,
					MatchDate:       matchDate2,
					MatchTime:       matchTime2,
					FieldNumber:     &pb.fieldNumber,
					Phase:           PhasePlayoffs,
					PlayoffRound:    ptrPlayoffRound(PlayoffRoundSemifinals),
					PlayoffPosition: &position,
					Leg:             ptrLeg(LegSecond),
					Status:          MatchStatusScheduled,
				})
			}
		}
	} else {
		// 4 teams: Direct semifinals (1v4, 2v3)
		semifinalPairs := [][2]int{{0, 3}, {1, 2}}
		for idx, pair := range semifinalPairs {
			homeTeamID := pb.standings[pair[0]].TeamID
			awayTeamID := pb.standings[pair[1]].TeamID
			matchDate, matchTime := getMatchDateTime(0, idx)
			position := idx + 1
			leg := (*Leg)(nil)
			if pb.homeAndAway {
				leg = ptrLeg(LegFirst)
			}
			matches = append(matches, Match{
				ID:              uuid.New(),
				TournamentID:    uuid.Nil,
				HomeTeamID:      homeTeamID,
				AwayTeamID:      awayTeamID,
				MatchDate:       matchDate,
				MatchTime:       matchTime,
				FieldNumber:     &pb.fieldNumber,
				Phase:           PhasePlayoffs,
				PlayoffRound:    ptrPlayoffRound(PlayoffRoundSemifinals),
				PlayoffPosition: &position,
				Leg:             leg,
				Status:          MatchStatusScheduled,
			})

			if pb.homeAndAway {
				matchDate2, matchTime2 := getMatchDateTime(3, idx)
				matches = append(matches, Match{
					ID:              uuid.New(),
					TournamentID:    uuid.Nil,
					HomeTeamID:      awayTeamID,
					AwayTeamID:      homeTeamID,
					MatchDate:       matchDate2,
					MatchTime:       matchTime2,
					FieldNumber:     &pb.fieldNumber,
					Phase:           PhasePlayoffs,
					PlayoffRound:    ptrPlayoffRound(PlayoffRoundSemifinals),
					PlayoffPosition: &position,
					Leg:             ptrLeg(LegSecond),
					Status:          MatchStatusScheduled,
				})
			}
		}
	}

	// Third-place match (always single match, placeholders)
	if pb.thirdPlaceMatch {
		dayOffset := 14
		if pb.numTeams == 4 {
			dayOffset = 7
		}
		matchDate, matchTime := getMatchDateTime(dayOffset, 0)
		position := 1
		matches = append(matches, Match{
			ID:              uuid.New(),
			TournamentID:    uuid.Nil,
			HomeTeamID:      pb.standings[0].TeamID,
			AwayTeamID:      pb.standings[1].TeamID,
			MatchDate:       matchDate,
			MatchTime:       matchTime,
			FieldNumber:     &pb.fieldNumber,
			Phase:           PhasePlayoffs,
			PlayoffRound:    ptrPlayoffRound(PlayoffRoundThirdPlace),
			PlayoffPosition: &position,
			Status:          MatchStatusScheduled,
		})
	}

	// Final (always single match, placeholders)
	dayOffset := 14
	matchIdx := 1
	if pb.numTeams == 4 {
		dayOffset = 7
		matchIdx = 0
	}
	if pb.thirdPlaceMatch {
		matchIdx++
	}
	matchDate, matchTime := getMatchDateTime(dayOffset, matchIdx)
	position := 1
	matches = append(matches, Match{
		ID:              uuid.New(),
		TournamentID:    uuid.Nil,
		HomeTeamID:      pb.standings[0].TeamID,
		AwayTeamID:      pb.standings[1].TeamID,
		MatchDate:       matchDate,
		MatchTime:       matchTime,
		FieldNumber:     &pb.fieldNumber,
		Phase:           PhasePlayoffs,
		PlayoffRound:    ptrPlayoffRound(PlayoffRoundFinal),
		PlayoffPosition: &position,
		Status:          MatchStatusScheduled,
	})

	return matches
}

func (pb *PlayoffBracketBuilder) conditionalDays(days int, condition bool) int {
	if condition {
		return days
	}
	return days
}

// Helper functions for pointers
func ptrStr(s string) *string { return &s }
func ptrStrFromLeg(l *Leg) *string {
	if l == nil {
		return nil
	}
	s := string(*l)
	return &s
}
func ptrLeg(l Leg) *Leg                             { return &l }
func ptrPlayoffRound(pr PlayoffRound) *PlayoffRound { return &pr }

// FixtureGenerator implements the greedy round-robin fixture generation algorithm.
type FixtureGenerator struct {
	teams          []TeamFixtureData
	isDoubleRound  bool
	hasOddTeams    bool
	n              int
	allPairs       map[[2]int]bool
	remainingPairs map[[2]int]bool
}

// NewFixtureGenerator creates a fixture generator.
func NewFixtureGenerator(teams []TeamFixtureData, isDoubleRound bool) *FixtureGenerator {
	n := len(teams)
	hasOdd := n%2 != 0

	gen := &FixtureGenerator{
		teams:          teams,
		isDoubleRound:  isDoubleRound,
		hasOddTeams:    hasOdd,
		n:              n,
		allPairs:       make(map[[2]int]bool),
		remainingPairs: make(map[[2]int]bool),
	}

	// Generate all pairs
	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			key := [2]int{i, j}
			gen.allPairs[key] = true
			gen.remainingPairs[key] = true
		}
	}

	// For double round, generate reverse pairs too
	if isDoubleRound {
		for i := 0; i < n; i++ {
			for j := 0; j < n; j++ {
				if i != j {
					key := [2]int{j, i} // j at home, i away
					gen.allPairs[key] = true
					gen.remainingPairs[key] = true
				}
			}
		}
	}

	return gen
}

// Generate creates the fixture schedule.
func (g *FixtureGenerator) Generate() []FixtureRound {
	// Calculate total rounds needed
	effectiveN := g.n
	if g.hasOddTeams {
		effectiveN = g.n + 1
	}

	totalRoundsFirstLeg := effectiveN - 1
	totalRounds := totalRoundsFirstLeg
	if g.isDoubleRound {
		totalRounds *= 2
	}

	var rounds []FixtureRound
	maxMatchesPerRound := g.n / 2
	if g.hasOddTeams {
		maxMatchesPerRound = (g.n - 1) / 2
	}

	// Simple greedy scheduling: for each round, try to match teams that haven't played
	for roundNum := 1; roundNum <= totalRounds; roundNum++ {
		round := FixtureRound{Round: roundNum}
		usedTeams := make(map[int]bool)
		var matchesToRemove [][2]int

		// Create a sorted list of pairs for determinism
		var pairs [][2]int
		for pair := range g.remainingPairs {
			pairs = append(pairs, pair)
		}
		sort.Slice(pairs, func(i, j int) bool {
			if pairs[i][0] != pairs[j][0] {
				return pairs[i][0] < pairs[j][0]
			}
			return pairs[i][1] < pairs[j][1]
		})

		// Try to schedule matches for this round
		for _, pair := range pairs {
			if len(round.Matches) >= maxMatchesPerRound {
				break
			}

			home, away := pair[0], pair[1]
			if usedTeams[home] || usedTeams[away] {
				continue
			}

			round.Matches = append(round.Matches, FixtureMatch{
				HomeTeamID: g.teams[home].ID,
				AwayTeamID: g.teams[away].ID,
			})

			usedTeams[home] = true
			usedTeams[away] = true
			matchesToRemove = append(matchesToRemove, pair)
		}

		// Remove scheduled matches from remaining
		for _, pair := range matchesToRemove {
			delete(g.remainingPairs, pair)
		}

		// Add bye team if needed
		if g.hasOddTeams && len(round.Matches) > 0 {
			for i := 0; i < g.n; i++ {
				if !usedTeams[i] {
					round.ByeTeamID = g.teams[i].ID
					break
				}
			}
		}

		if len(round.Matches) > 0 {
			rounds = append(rounds, round)
		}

		// Stop if all pairs are scheduled
		if len(g.remainingPairs) == 0 {
			break
		}
	}

	return rounds
}

// fixtureRounds builds the round robin: one for all teams, or one per group
// merged so that round N holds every group's round N. byes maps
// (round index, match index) to the team resting in that round/group.
func fixtureRounds(req GenerateFixturesRequest, double bool) ([]FixtureRound, map[[2]int]uuid.UUID) {
	byes := map[[2]int]uuid.UUID{}
	if len(req.Groups) == 0 {
		rounds := NewFixtureGenerator(req.Teams, double).Generate()
		for ri, r := range rounds {
			if r.ByeTeamID != uuid.Nil && len(r.Matches) > 0 {
				byes[[2]int{ri, 0}] = r.ByeTeamID
			}
		}
		return rounds, byes
	}
	var merged []FixtureRound
	for _, g := range req.Groups {
		for ri, r := range NewFixtureGenerator(g.Teams, double).Generate() {
			for len(merged) <= ri {
				merged = append(merged, FixtureRound{Round: len(merged) + 1})
			}
			if r.ByeTeamID != uuid.Nil {
				byes[[2]int{ri, len(merged[ri].Matches)}] = r.ByeTeamID
			}
			merged[ri].Matches = append(merged[ri].Matches, r.Matches...)
		}
	}
	return merged, byes
}
