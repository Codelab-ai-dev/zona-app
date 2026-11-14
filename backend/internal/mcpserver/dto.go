package mcpserver

import (
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/leagues"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/matches"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/stats"
)

// Tool outputs. Only fields the public portal already shows; never admin or
// owner IDs, contact data, documents, birth dates or photos of players.

// League is a public league.
type League struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Slug        string  `json:"slug"`
	Description *string `json:"description,omitempty"`
	Logo        *string `json:"logo,omitempty"`
}

// LeagueList is the output of search_leagues.
type LeagueList struct {
	Leagues []League `json:"leagues"`
	Total   int      `json:"total" jsonschema:"ligas que coinciden"`
	HasMore bool     `json:"has_more" jsonschema:"hay más resultados con un offset mayor"`
	Partial bool     `json:"partial,omitempty" jsonschema:"la búsqueda revisó solo las primeras 500 ligas activas"`
}

// LeagueRef identifies a league inside another result.
type LeagueRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// Tournament is a public tournament.
type Tournament struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Format    string `json:"format"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	IsActive  bool   `json:"is_active"`
}

// TournamentList is the output of get_tournaments.
type TournamentList struct {
	Tournaments []Tournament `json:"tournaments"`
	Total       int          `json:"total"`
	HasMore     bool         `json:"has_more"`
}

// TeamRef identifies a team inside a match.
type TeamRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// Match is a published match.
type Match struct {
	ID           string    `json:"id"`
	Round        *int      `json:"round,omitempty"`
	Phase        string    `json:"phase"`
	PlayoffRound *string   `json:"playoff_round,omitempty"`
	Leg          *string   `json:"leg,omitempty"`
	Date         time.Time `json:"date"`
	Time         *string   `json:"time,omitempty"`
	FieldNumber  *int      `json:"field_number,omitempty"`
	Status       string    `json:"status"`
	Home         TeamRef   `json:"home"`
	Away         TeamRef   `json:"away"`
	HomeScore    *int      `json:"home_score,omitempty"`
	AwayScore    *int      `json:"away_score,omitempty"`
}

// MatchList is the output of get_matches.
type MatchList struct {
	Matches []Match `json:"matches"`
	HasMore bool    `json:"has_more"`
}

// Standing is one row of a standings table.
type Standing struct {
	Position         int     `json:"position"`
	TeamID           string  `json:"team_id"`
	TeamName         string  `json:"team_name"`
	GroupName        *string `json:"group_name,omitempty"`
	Played           int     `json:"played"`
	Won              int     `json:"won"`
	Drawn            int     `json:"drawn"`
	Lost             int     `json:"lost"`
	GoalsFor         int     `json:"goals_for"`
	GoalsAgainst     int     `json:"goals_against"`
	GoalDifference   int     `json:"goal_difference"`
	Points           int     `json:"points"`
	PointsAdjustment int     `json:"points_adjustment,omitempty"`
	AdjustmentReason *string `json:"adjustment_reason,omitempty"`
	RecentForm       *string `json:"recent_form,omitempty"`
}

// StandingsList is the output of get_standings.
type StandingsList struct {
	Standings []Standing `json:"standings"`
}

// Scorer is one row of the top scorers table.
type Scorer struct {
	Position      int    `json:"position"`
	PlayerID      string `json:"player_id"`
	PlayerName    string `json:"player_name"`
	JerseyNumber  int    `json:"jersey_number"`
	TeamID        string `json:"team_id"`
	TeamName      string `json:"team_name"`
	Goals         int64  `json:"goals"`
	MatchesPlayed int64  `json:"matches_played"`
}

// ScorerList is the output of get_top_scorers.
type ScorerList struct {
	Scorers []Scorer `json:"scorers"`
}

// RosterEntry is a player as shown on the public team page.
type RosterEntry struct {
	Name         string `json:"name"`
	JerseyNumber int    `json:"jersey_number"`
	Position     string `json:"position"`
}

// TeamProfile is the output of get_team.
type TeamProfile struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	Slug         string        `json:"slug"`
	League       LeagueRef     `json:"league"`
	TournamentID *string       `json:"tournament_id,omitempty"`
	Logo         *string       `json:"logo,omitempty"`
	Description  *string       `json:"description,omitempty"`
	GroupName    *string       `json:"group_name,omitempty"`
	Roster       []RosterEntry `json:"roster"`
}

func leagueDTOs(ls []leagues.League) []League {
	out := make([]League, 0, len(ls))
	for _, l := range ls {
		d := l.Description
		out = append(out, League{ID: l.ID.String(), Name: l.Name, Slug: l.Slug, Description: clip(nonEmpty(d)), Logo: l.Logo})
	}
	return out
}

func tournamentDTO(t leagues.Tournament) Tournament {
	return Tournament{ID: t.ID.String(), Name: t.Name, Format: t.TournamentFormat, StartDate: t.StartDate, EndDate: t.EndDate, IsActive: t.IsActive}
}

func matchDTO(m matches.Match) Match {
	out := Match{
		ID: m.ID.String(), Round: m.Round, Phase: string(m.Phase), Date: m.MatchDate, Time: hhmm(m.MatchTime),
		FieldNumber: m.FieldNumber, Status: string(m.Status),
		Home: TeamRef{ID: m.HomeTeamID.String(), Name: m.HomeTeamName},
		Away: TeamRef{ID: m.AwayTeamID.String(), Name: m.AwayTeamName},
	}
	if m.PlayoffRound != nil {
		s := string(*m.PlayoffRound)
		out.PlayoffRound = &s
	}
	if m.Leg != nil {
		s := string(*m.Leg)
		out.Leg = &s
	}
	// A scheduled match stores 0-0; showing it would read as a real result.
	if m.Status == matches.MatchStatusFinished || m.Status == matches.MatchStatusInProgress {
		h, a := m.HomeScore, m.AwayScore
		out.HomeScore, out.AwayScore = &h, &a
	}
	return out
}

func standingDTO(r stats.Standings) Standing {
	return Standing{
		Position: r.Position, TeamID: r.TeamID.String(), TeamName: r.TeamName, GroupName: r.GroupName,
		Played: r.MatchesPlayed, Won: r.MatchesWon, Drawn: r.MatchesDrawn, Lost: r.MatchesLost,
		GoalsFor: r.GoalsFor, GoalsAgainst: r.GoalsAgainst, GoalDifference: r.GoalDifference,
		Points: r.Points, PointsAdjustment: r.PointsAdjustment, AdjustmentReason: r.AdjustmentReason,
		RecentForm: r.RecentForm,
	}
}

func nonEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func idString(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	s := id.String()
	return &s
}

// hhmm trims a Postgres time ("16:00:00.000000") to "16:00".
func hhmm(t *string) *string {
	if t == nil || len(*t) < 5 {
		return t
	}
	s := (*t)[:5]
	return &s
}
