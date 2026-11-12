// Package matches handles tournament fixtures, match scheduling, results and referee reports.
package matches

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// MatchStatus is the enum type for match statuses.
type MatchStatus string

const (
	MatchStatusScheduled  MatchStatus = "scheduled"
	MatchStatusInProgress MatchStatus = "in_progress"
	MatchStatusFinished   MatchStatus = "finished"
	MatchStatusCancelled  MatchStatus = "cancelled"
)

// CardType is the enum type for card colors.
type CardType string

const (
	CardTypeYellow CardType = "yellow"
	CardTypeRed    CardType = "red"
)

// GoalType is the enum type for goal types.
type GoalType string

const (
	GoalTypeNormal   GoalType = "normal"
	GoalTypePenalty  GoalType = "penalty"
	GoalTypeOwnGoal  GoalType = "own_goal"
	GoalTypeFreeKick GoalType = "free_kick"
)

// Phase is the enum type for match phases.
type Phase string

const (
	PhaseRegular  Phase = "regular"
	PhasePlayoffs Phase = "playoffs"
)

// PlayoffRound is the enum type for playoff rounds.
type PlayoffRound string

const (
	PlayoffRoundQuarterfinals PlayoffRound = "quarterfinals"
	PlayoffRoundSemifinals    PlayoffRound = "semifinals"
	PlayoffRoundFinal         PlayoffRound = "final"
	PlayoffRoundThirdPlace    PlayoffRound = "third_place"
)

// Leg is the enum type for double-leg matches.
type Leg string

const (
	LegFirst  Leg = "first"
	LegSecond Leg = "second"
)

// Match represents a match between two teams.
type Match struct {
	ID              uuid.UUID     `json:"id"`
	TournamentID    uuid.UUID     `json:"tournament_id"`
	HomeTeamID      uuid.UUID     `json:"home_team_id"`
	AwayTeamID      uuid.UUID     `json:"away_team_id"`
	HomeScore       int           `json:"home_score"`
	AwayScore       int           `json:"away_score"`
	MatchDate       time.Time     `json:"match_date"`
	MatchTime       *string       `json:"match_time,omitempty"`
	Status          MatchStatus   `json:"status"`
	Round           *int          `json:"round,omitempty"`
	FieldNumber     *int          `json:"field_number,omitempty"`
	Phase           Phase         `json:"phase"`
	PlayoffRound    *PlayoffRound `json:"playoff_round,omitempty"`
	PlayoffPosition *int          `json:"playoff_position,omitempty"`
	Leg             *Leg          `json:"leg,omitempty"`
	ByeTeamID       *uuid.UUID    `json:"bye_team_id,omitempty"`
	IsPublished     bool          `json:"is_published"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
	// Team display data, filled for list and detail responses so clients
	// don't need one request per team.
	HomeTeamName string  `json:"home_team_name"`
	AwayTeamName string  `json:"away_team_name"`
	HomeTeamLogo *string `json:"home_team_logo,omitempty"`
	AwayTeamLogo *string `json:"away_team_logo,omitempty"`
}

// MatchWithRelations includes related data fetched from other tables.
type MatchWithRelations struct {
	Match
	HomeTeam  *Team      `json:"home_team,omitempty"`
	AwayTeam  *Team      `json:"away_team,omitempty"`
	Goals     []Goal     `json:"goals,omitempty"`
	Cards     []Card     `json:"cards,omitempty"`
	Incidents []Incident `json:"incidents,omitempty"`
}

// Team represents basic team data for match responses.
type Team struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	Slug string    `json:"slug"`
	Logo *string   `json:"logo,omitempty"`
}

// Goal represents a goal scored in a match.
type Goal struct {
	ID             uuid.UUID  `json:"id"`
	MatchID        uuid.UUID  `json:"match_id"`
	PlayerID       uuid.UUID  `json:"player_id"`
	TeamID         uuid.UUID  `json:"team_id"`
	Minute         int        `json:"minute"`
	GoalType       GoalType   `json:"goal_type"`
	AssistPlayerID *uuid.UUID `json:"assist_player_id,omitempty"`
	Description    *string    `json:"description,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	// Display names (read-only).
	PlayerName       *string `json:"player_name,omitempty"`
	PlayerJersey     *int    `json:"player_jersey,omitempty"`
	AssistPlayerName *string `json:"assist_player_name,omitempty"`
}

// Card represents a disciplinary card in a match.
type Card struct {
	ID        uuid.UUID `json:"id"`
	MatchID   uuid.UUID `json:"match_id"`
	PlayerID  uuid.UUID `json:"player_id"`
	TeamID    uuid.UUID `json:"team_id"`
	CardType  CardType  `json:"card_type"`
	Minute    int       `json:"minute"`
	Reason    *string   `json:"reason,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	// Display names (read-only).
	PlayerName   *string `json:"player_name,omitempty"`
	PlayerJersey *int    `json:"player_jersey,omitempty"`
}

// Incident represents a match incident (not a goal or card).
type Incident struct {
	ID           uuid.UUID  `json:"id"`
	MatchID      uuid.UUID  `json:"match_id"`
	IncidentType string     `json:"incident_type"`
	Description  string     `json:"description"`
	Minute       *int       `json:"minute,omitempty"`
	PlayerID     *uuid.UUID `json:"player_id,omitempty"`
	TeamID       *uuid.UUID `json:"team_id,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	PlayerName   *string    `json:"player_name,omitempty"`
}

// RefereeReport represents a match referee report.
type RefereeReport struct {
	ID                  uuid.UUID `json:"id"`
	MatchID             uuid.UUID `json:"match_id"`
	RefereeName         *string   `json:"referee_name,omitempty"`
	AssistantReferee1   *string   `json:"assistant_referee_1,omitempty"`
	AssistantReferee2   *string   `json:"assistant_referee_2,omitempty"`
	FourthOfficial      *string   `json:"fourth_official,omitempty"`
	GeneralObservations *string   `json:"general_observations,omitempty"`
	WeatherConditions   *string   `json:"weather_conditions,omitempty"`
	FieldConditions     *string   `json:"field_conditions,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// CreateMatchRequest is the DTO for creating a single match.
type CreateMatchRequest struct {
	TournamentID    uuid.UUID  `json:"tournament_id"`
	HomeTeamID      uuid.UUID  `json:"home_team_id"`
	AwayTeamID      uuid.UUID  `json:"away_team_id"`
	MatchDate       time.Time  `json:"match_date"`
	MatchTime       *string    `json:"match_time,omitempty"`
	Round           *int       `json:"round,omitempty"`
	FieldNumber     *int       `json:"field_number,omitempty"`
	Phase           *string    `json:"phase,omitempty"`
	PlayoffRound    *string    `json:"playoff_round,omitempty"`
	PlayoffPosition *int       `json:"playoff_position,omitempty"`
	Leg             *string    `json:"leg,omitempty"`
	ByeTeamID       *uuid.UUID `json:"bye_team_id,omitempty"`
}

// Validate checks request constraints.
func (r CreateMatchRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.TournamentID == uuid.Nil {
		errs["tournament_id"] = "requerido"
	}
	if r.HomeTeamID == uuid.Nil {
		errs["home_team_id"] = "requerido"
	}
	if r.AwayTeamID == uuid.Nil {
		errs["away_team_id"] = "requerido"
	}
	if r.HomeTeamID == r.AwayTeamID {
		errs["away_team_id"] = "un equipo no puede jugar contra sí mismo"
	}
	if r.MatchDate.IsZero() {
		errs["match_date"] = "requerido"
	}
	if r.Round != nil && *r.Round <= 0 {
		errs["round"] = "debe ser mayor que 0"
	}
	if r.FieldNumber != nil && *r.FieldNumber <= 0 {
		errs["field_number"] = "debe ser mayor que 0"
	}
	if r.Phase != nil && *r.Phase != string(PhaseRegular) && *r.Phase != string(PhasePlayoffs) {
		errs["phase"] = "debe ser 'regular' o 'playoffs'"
	}
	if r.PlayoffRound != nil && !isValidPlayoffRound(*r.PlayoffRound) {
		errs["playoff_round"] = "valor inválido"
	}
	if r.Leg != nil && *r.Leg != string(LegFirst) && *r.Leg != string(LegSecond) {
		errs["leg"] = "debe ser 'first' o 'second'"
	}
	return errs
}

// BulkCreateMatchesRequest is the DTO for bulk fixture creation.
type BulkCreateMatchesRequest struct {
	TournamentID  uuid.UUID            `json:"tournament_id"`
	Matches       []CreateMatchRequest `json:"matches"`
	IsDoubleRound *bool                `json:"is_double_round,omitempty"`
}

// Validate checks request constraints.
func (r BulkCreateMatchesRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.TournamentID == uuid.Nil {
		errs["tournament_id"] = "requerido"
	}
	if len(r.Matches) == 0 {
		errs["matches"] = "se requiere al menos un partido"
	}
	for _, m := range r.Matches {
		if fieldErrs := m.Validate(); len(fieldErrs) > 0 {
			for k, v := range fieldErrs {
				errs[k] = v
			}
		}
	}
	return errs
}

// GenerateFixturesRequest is the DTO for generating fixtures algorithmically.
type GenerateFixturesRequest struct {
	TournamentID  uuid.UUID         `json:"tournament_id"`
	Teams         []TeamFixtureData `json:"teams"`
	IsDoubleRound *bool             `json:"is_double_round,omitempty"`
	Schedule      *FixtureSchedule  `json:"schedule"`
	// Groups (group stage): each group plays its own round robin and round N
	// gathers every group's matches. When set, Teams is ignored.
	Groups []FixtureGroup `json:"groups,omitempty"`
	// DryRun returns the generated calendar without saving it (preview).
	DryRun bool `json:"dry_run,omitempty"`
}

// FixtureGroup is one group of a group-stage calendar.
type FixtureGroup struct {
	Name  string            `json:"name"`
	Teams []TeamFixtureData `json:"teams"`
}

// Validate checks request constraints.
func (r GenerateFixturesRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.TournamentID == uuid.Nil {
		errs["tournament_id"] = "requerido"
	}
	if len(r.Groups) > 0 {
		seen := map[uuid.UUID]bool{}
		for _, g := range r.Groups {
			if len(g.Teams) < 2 {
				errs["groups"] = fmt.Sprintf("el grupo %s necesita al menos 2 equipos", g.Name)
			}
			for _, t := range g.Teams {
				if seen[t.ID] {
					errs["groups"] = "un equipo no puede estar en dos grupos"
				}
				seen[t.ID] = true
			}
		}
	} else if len(r.Teams) < 2 {
		errs["teams"] = "se requieren al menos 2 equipos"
	}
	if r.Schedule == nil {
		errs["schedule"] = "requerido: fecha de inicio, días y horario de juego"
	} else {
		for k, v := range r.Schedule.Validate() {
			errs[k] = v
		}
	}
	return errs
}

// TeamFixtureData is used in fixture generation.
type TeamFixtureData struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

// UpdateMatchScheduleRequest updates match timing details.
type UpdateMatchScheduleRequest struct {
	MatchDate   *time.Time `json:"match_date,omitempty"`
	MatchTime   *string    `json:"match_time,omitempty"`
	FieldNumber *int       `json:"field_number,omitempty"`
	Round       *int       `json:"round,omitempty"`
	// Teams can only change while the match is scheduled.
	HomeTeamID *uuid.UUID `json:"home_team_id,omitempty"`
	AwayTeamID *uuid.UUID `json:"away_team_id,omitempty"`
}

// Validate checks request constraints.
func (r UpdateMatchScheduleRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.FieldNumber != nil && *r.FieldNumber <= 0 {
		errs["field_number"] = "debe ser mayor que 0"
	}
	if r.Round != nil && *r.Round <= 0 {
		errs["round"] = "debe ser mayor que 0"
	}
	if r.HomeTeamID != nil && r.AwayTeamID != nil && *r.HomeTeamID == *r.AwayTeamID {
		errs["away_team_id"] = "debe ser distinto del local"
	}
	return errs
}

// PostMatchResultRequest provides match result data (goals, cards, incidents).
type PostMatchResultRequest struct {
	HomeScore int                   `json:"home_score"`
	AwayScore int                   `json:"away_score"`
	Goals     []PostGoalRequest     `json:"goals,omitempty"`
	Cards     []PostCardRequest     `json:"cards,omitempty"`
	Incidents []PostIncidentRequest `json:"incidents,omitempty"`
	// Observations are the referee's general observations; stored in the
	// match referee report (legacy behaviour of the result form).
	Observations *string `json:"observations,omitempty"`
}

// Validate checks request constraints.
func (r PostMatchResultRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.HomeScore < 0 {
		errs["home_score"] = "no puede ser negativo"
	}
	if r.AwayScore < 0 {
		errs["away_score"] = "no puede ser negativo"
	}
	for idx, g := range r.Goals {
		if fieldErrs := g.Validate(); len(fieldErrs) > 0 {
			for k, v := range fieldErrs {
				errs[k] = v
			}
		}
		if idx > 0 && g.Minute < r.Goals[idx-1].Minute {
			errs["goals"] = "los minutos deben estar en orden ascendente"
			break
		}
	}
	for idx, c := range r.Cards {
		if fieldErrs := c.Validate(); len(fieldErrs) > 0 {
			for k, v := range fieldErrs {
				errs[k] = v
			}
		}
		if idx > 0 && c.Minute < r.Cards[idx-1].Minute {
			errs["cards"] = "los minutos deben estar en orden ascendente"
			break
		}
	}
	return errs
}

// PostGoalRequest is a goal creation DTO.
type PostGoalRequest struct {
	PlayerID       uuid.UUID  `json:"player_id"`
	TeamID         uuid.UUID  `json:"team_id"`
	Minute         int        `json:"minute"`
	GoalType       *string    `json:"goal_type,omitempty"`
	AssistPlayerID *uuid.UUID `json:"assist_player_id,omitempty"`
	Description    *string    `json:"description,omitempty"`
}

// Validate checks request constraints.
func (r PostGoalRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.PlayerID == uuid.Nil {
		errs["player_id"] = "requerido"
	}
	if r.TeamID == uuid.Nil {
		errs["team_id"] = "requerido"
	}
	if r.Minute < 1 || r.Minute > 120 {
		errs["minute"] = "debe estar entre 1 y 120"
	}
	if r.GoalType != nil && !isValidGoalType(*r.GoalType) {
		errs["goal_type"] = "valor inválido"
	}
	return errs
}

// PostCardRequest is a card creation DTO.
type PostCardRequest struct {
	PlayerID uuid.UUID `json:"player_id"`
	TeamID   uuid.UUID `json:"team_id"`
	CardType string    `json:"card_type"`
	Minute   int       `json:"minute"`
	Reason   *string   `json:"reason,omitempty"`
}

// Validate checks request constraints.
func (r PostCardRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.PlayerID == uuid.Nil {
		errs["player_id"] = "requerido"
	}
	if r.TeamID == uuid.Nil {
		errs["team_id"] = "requerido"
	}
	if r.CardType != string(CardTypeYellow) && r.CardType != string(CardTypeRed) {
		errs["card_type"] = "debe ser 'yellow' o 'red'"
	}
	if r.Minute < 1 || r.Minute > 120 {
		errs["minute"] = "debe estar entre 1 y 120"
	}
	return errs
}

// PostIncidentRequest is an incident creation DTO.
type PostIncidentRequest struct {
	IncidentType string     `json:"incident_type"`
	Description  string     `json:"description"`
	Minute       *int       `json:"minute,omitempty"`
	PlayerID     *uuid.UUID `json:"player_id,omitempty"`
	TeamID       *uuid.UUID `json:"team_id,omitempty"`
}

// Validate checks request constraints.
func (r PostIncidentRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.IncidentType == "" {
		errs["incident_type"] = "requerido"
	}
	if r.Description == "" {
		errs["description"] = "requerido"
	}
	if r.Minute != nil && (*r.Minute < 1 || *r.Minute > 120) {
		errs["minute"] = "debe estar entre 1 y 120"
	}
	return errs
}

// PostRefereeReportRequest is a referee report creation DTO.
type PostRefereeReportRequest struct {
	RefereeName         *string `json:"referee_name,omitempty"`
	AssistantReferee1   *string `json:"assistant_referee_1,omitempty"`
	AssistantReferee2   *string `json:"assistant_referee_2,omitempty"`
	FourthOfficial      *string `json:"fourth_official,omitempty"`
	GeneralObservations *string `json:"general_observations,omitempty"`
	WeatherConditions   *string `json:"weather_conditions,omitempty"`
	FieldConditions     *string `json:"field_conditions,omitempty"`
}

// PublishMatchRequest updates the is_published flag.
type PublishMatchRequest struct {
	IsPublished bool `json:"is_published"`
}

// Validate checks request constraints.
func (r PublishMatchRequest) Validate() map[string]string {
	return make(map[string]string)
}

// UpdateStatusRequest starts, cancels or reschedules a match that has no
// result yet ("finished" is only reachable by posting the result).
type UpdateStatusRequest struct {
	Status MatchStatus `json:"status"`
}

// Validate checks request constraints.
func (r UpdateStatusRequest) Validate() map[string]string {
	errs := make(map[string]string)
	switch r.Status {
	case "scheduled", "in_progress", "cancelled":
	default:
		errs["status"] = "debe ser scheduled, in_progress o cancelled"
	}
	return errs
}

// PublishRoundRequest publishes/unpublishes all matches in a round.
type PublishRoundRequest struct {
	IsPublished bool `json:"is_published"`
}

// Validate checks request constraints.
func (r PublishRoundRequest) Validate() map[string]string {
	return make(map[string]string)
}

// GeneratePlayoffsRequest generates a playoff bracket from standings.
type GeneratePlayoffsRequest struct {
	TournamentID    uuid.UUID  `json:"tournament_id"`
	NumTeams        int        `json:"num_teams"` // 4 or 8
	StartDate       httpx.Date `json:"start_date"`
	StartTime       string     `json:"start_time"` // HH:MM
	FieldNumber     int        `json:"field_number"`
	ThirdPlaceMatch bool       `json:"third_place_match"`
	HomeAndAway     bool       `json:"home_and_away"` // Double-leg
	// TeamIDs, when set, are the qualified teams in seed order (1st seed
	// first): group qualifiers or a manual seeding. Without it the bracket
	// is built from the overall standings.
	TeamIDs []uuid.UUID `json:"team_ids,omitempty"`
}

// Validate checks request constraints.
func (r GeneratePlayoffsRequest) Validate() map[string]string {
	errs := make(map[string]string)
	if r.TournamentID == uuid.Nil {
		errs["tournament_id"] = "requerido"
	}
	if r.NumTeams != 4 && r.NumTeams != 8 {
		errs["num_teams"] = "debe ser 4 u 8"
	}
	if len(r.TeamIDs) > 0 {
		seen := map[uuid.UUID]bool{}
		for _, id := range r.TeamIDs {
			if id == uuid.Nil || seen[id] {
				errs["team_ids"] = "equipos repetidos o vacíos"
			}
			seen[id] = true
		}
		if len(r.TeamIDs) != r.NumTeams {
			errs["team_ids"] = fmt.Sprintf("debe incluir exactamente %d equipos", r.NumTeams)
		}
	}
	if r.StartDate.IsZero() {
		errs["start_date"] = "requerido"
	}
	if r.StartTime == "" {
		errs["start_time"] = "requerido"
	}
	if r.FieldNumber <= 0 {
		errs["field_number"] = "debe ser mayor que 0"
	}
	return errs
}

// DuplicateMatchGroup groups duplicate matches by team pair.
type DuplicateMatchGroup struct {
	Pair    string           `json:"pair"`
	Matches []DuplicateMatch `json:"matches"`
}

// DuplicateMatch represents a single match in a duplicate group.
type DuplicateMatch struct {
	ID       uuid.UUID `json:"id"`
	Round    *int      `json:"round,omitempty"`
	Date     time.Time `json:"date"`
	HomeTeam string    `json:"home_team"`
	AwayTeam string    `json:"away_team"`
}

// StandingsTeam represents a team's standing with stats.
type StandingsTeam struct {
	TeamID           uuid.UUID
	Points           int
	GoalDifference   int
	GoalsFor         int
	GoalsAgainst     int
	MatchesPlayed    int
	MatchesWon       int
	MatchesDrawn     int
	MatchesLost      int
	PointsAdjustment int
}

// Repository is the persistence contract.
type Repository interface {
	// TournamentLeagueActive reports whether the tournament's league is active.
	TournamentLeagueActive(ctx context.Context, tournamentID uuid.UUID) (bool, error)

	GetMatchByID(ctx context.Context, matchID uuid.UUID) (Match, error)
	GetMatchWithRelations(ctx context.Context, matchID uuid.UUID) (MatchWithRelations, error)
	ListMatchesByTournament(ctx context.Context, tournamentID uuid.UUID, filters ListMatchesFilter) ([]Match, error)
	ListMatchesByTeam(ctx context.Context, teamID uuid.UUID, filters ListMatchesFilter) ([]Match, error)
	ListUpcomingMatches(ctx context.Context, tournamentID uuid.UUID, limit int) ([]Match, error)
	ListPendingMatchesByLeague(ctx context.Context, leagueID uuid.UUID, limit int) ([]Match, error)
	FindDuplicateMatches(ctx context.Context, tournamentID uuid.UUID) ([]DuplicateMatchGroup, error)
	CreateMatch(ctx context.Context, req CreateMatchRequest) (Match, error)
	CreateMatches(ctx context.Context, tournamentID uuid.UUID, reqs []CreateMatchRequest) ([]Match, error)
	UpdateMatchSchedule(ctx context.Context, matchID uuid.UUID, req UpdateMatchScheduleRequest) (Match, error)
	DeleteMatch(ctx context.Context, matchID uuid.UUID) error
	CreateGoal(ctx context.Context, matchID uuid.UUID, req PostGoalRequest) (Goal, error)
	CreateCard(ctx context.Context, matchID uuid.UUID, req PostCardRequest) (Card, error)
	CreateIncident(ctx context.Context, matchID uuid.UUID, req PostIncidentRequest) (Incident, error)
	CreateOrUpdateRefereeReport(ctx context.Context, matchID uuid.UUID, req PostRefereeReportRequest) (RefereeReport, error)
	GetRefereeReport(ctx context.Context, matchID uuid.UUID) (RefereeReport, error)
	PostMatchResult(ctx context.Context, matchID uuid.UUID, homeScore int, awayScore int) error
	PublishMatch(ctx context.Context, matchID uuid.UUID, isPublished bool) error
	PublishRound(ctx context.Context, tournamentID uuid.UUID, round int, isPublished bool) error
	GetTournamentStandings(ctx context.Context, tournamentID uuid.UUID) ([]StandingsTeam, error)
}

// DeleteMatchesResponse reports how many matches a bulk delete removed.
type DeleteMatchesResponse struct {
	Deleted int64 `json:"deleted"`
}

// ListMatchesFilter groups optional filters for list operations.
type ListMatchesFilter struct {
	Status    *MatchStatus
	Round     *int
	Phase     *string
	StartDate *time.Time
	EndDate   *time.Time
	Limit     int
	Offset    int
}

// Utility functions for enum validation

func isValidGoalType(s string) bool {
	return s == string(GoalTypeNormal) || s == string(GoalTypePenalty) ||
		s == string(GoalTypeOwnGoal) || s == string(GoalTypeFreeKick)
}

func isValidPlayoffRound(s string) bool {
	return s == string(PlayoffRoundQuarterfinals) || s == string(PlayoffRoundSemifinals) ||
		s == string(PlayoffRoundFinal) || s == string(PlayoffRoundThirdPlace)
}
