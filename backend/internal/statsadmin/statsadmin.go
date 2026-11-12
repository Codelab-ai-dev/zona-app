// Package statsadmin holds the league admin's manual corrections: player
// stats not tied to a match ("goles extemporáneos"), standings edits for
// results the app never recorded, and clearing a league's suspensions.
//
// Corrections are stored as deltas over the match data (player_stats rows
// without a match; team_stats *_adjustment columns), so recalculations
// never lose them and new results keep adding up.
package statsadmin

import (
	"github.com/google/uuid"
)

// ManualStats are a player's manual stats in a tournament.
type ManualStats struct {
	PlayerID     uuid.UUID `json:"player_id"`
	PlayerName   string    `json:"player_name"`
	JerseyNumber int       `json:"jersey_number"`
	TeamID       uuid.UUID `json:"team_id"`
	TeamName     string    `json:"team_name"`
	Goals        int       `json:"goals"`
	Assists      int       `json:"assists"`
	YellowCards  int       `json:"yellow_cards"`
	RedCards     int       `json:"red_cards"`
}

// SetManualStatsRequest replaces a player's manual stats in a tournament.
// All zeros removes them.
type SetManualStatsRequest struct {
	Goals       int `json:"goals"`
	Assists     int `json:"assists"`
	YellowCards int `json:"yellow_cards"`
	RedCards    int `json:"red_cards"`
}

// Validate implements httpx.Validator.
func (r SetManualStatsRequest) Validate() map[string]string {
	errs := map[string]string{}
	for field, v := range map[string]int{"goals": r.Goals, "assists": r.Assists, "yellow_cards": r.YellowCards, "red_cards": r.RedCards} {
		if v < 0 || v > 500 {
			errs[field] = "debe estar entre 0 y 500"
		}
	}
	return errs
}

// SetStandingsRequest sets a team's displayed totals in a tournament. The
// difference with the match data is stored as an adjustment.
type SetStandingsRequest struct {
	MatchesPlayed int    `json:"matches_played"`
	MatchesWon    int    `json:"matches_won"`
	MatchesDrawn  int    `json:"matches_drawn"`
	MatchesLost   int    `json:"matches_lost"`
	GoalsFor      int    `json:"goals_for"`
	GoalsAgainst  int    `json:"goals_against"`
	Reason        string `json:"reason"`
}

// Validate implements httpx.Validator.
func (r SetStandingsRequest) Validate() map[string]string {
	errs := map[string]string{}
	for field, v := range map[string]int{
		"matches_played": r.MatchesPlayed, "matches_won": r.MatchesWon, "matches_drawn": r.MatchesDrawn,
		"matches_lost": r.MatchesLost, "goals_for": r.GoalsFor, "goals_against": r.GoalsAgainst,
	} {
		if v < 0 || v > 1000 {
			errs[field] = "debe estar entre 0 y 1000"
		}
	}
	if r.MatchesWon+r.MatchesDrawn+r.MatchesLost != r.MatchesPlayed {
		errs["matches_played"] = "debe ser la suma de ganados, empatados y perdidos"
	}
	if len(r.Reason) > 500 {
		errs["reason"] = "máximo 500 caracteres"
	}
	return errs
}

// ClearSuspensionsResponse reports how many suspensions were removed.
type ClearSuspensionsResponse struct {
	Deleted int64 `json:"deleted"`
}
