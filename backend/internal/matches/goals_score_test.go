package matches

import (
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// The API refuses results with more recorded goals than the score, like the
// web and the app (#84).
func TestGoalsWithinScore(t *testing.T) {
	home, away := uuid.New(), uuid.New()
	m := Match{HomeTeamID: home, AwayTeamID: away}
	own := string(GoalTypeOwnGoal)
	goal := func(team uuid.UUID, ownGoal bool) PostGoalRequest {
		g := PostGoalRequest{TeamID: team, Minute: 10}
		if ownGoal {
			g.GoalType = &own
		}
		return g
	}
	cases := []struct {
		name      string
		homeScore int
		awayScore int
		goals     []PostGoalRequest
		wantErr   string
	}{
		{"goals match the score", 2, 1, []PostGoalRequest{goal(home, false), goal(home, false), goal(away, false)}, ""},
		{"fewer goals than the score", 2, 1, []PostGoalRequest{goal(home, false)}, ""},
		{"no goals recorded", 3, 0, nil, ""},
		{"home goals exceed", 1, 0, []PostGoalRequest{goal(home, false), goal(home, false)}, "del local (2) exceden el marcador (1)"},
		{"away goals exceed", 0, 0, []PostGoalRequest{goal(away, false)}, "del visitante (1) exceden el marcador (0)"},
		{"own goal counts for the rival", 1, 0, []PostGoalRequest{goal(away, true)}, ""},
		{"own goal exceeding the rival's score", 0, 1, []PostGoalRequest{goal(away, true)}, "del local (1) exceden el marcador (0)"},
		{"both exceed", 0, 0, []PostGoalRequest{goal(home, false), goal(away, false)}, "del local (1) exceden el marcador (0). Los goles registrados del visitante (1)"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := goalsWithinScore(m, PostMatchResultRequest{HomeScore: c.homeScore, AwayScore: c.awayScore, Goals: c.goals})
			if c.wantErr == "" {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				return
			}
			var he *httpx.Error
			if !errors.As(err, &he) || he.Status != 422 || !strings.Contains(he.Fields["goals"], c.wantErr) {
				t.Fatalf("err = %v (%v), want 422 with %q", err, he, c.wantErr)
			}
		})
	}
}
