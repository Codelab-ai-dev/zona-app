package mcpserver

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/leagues"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/matches"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/stats"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/teams"
)

// --- fakes ---

type fakeLeagues struct {
	active      []leagues.League
	hidden      map[uuid.UUID]bool // league IDs an anonymous caller cannot see
	tournaments map[uuid.UUID][]leagues.Tournament
}

func (f *fakeLeagues) ListActiveLeagues(_ context.Context, limit, offset int) ([]leagues.League, int, error) {
	if offset >= len(f.active) {
		return nil, len(f.active), nil
	}
	return f.active[offset:min(offset+limit, len(f.active))], len(f.active), nil
}

func (f *fakeLeagues) GetLeagueByID(_ context.Context, _ auth.Principal, id uuid.UUID) (leagues.League, error) {
	if f.hidden[id] {
		return leagues.League{}, httpx.ErrNotFound
	}
	for _, l := range f.active {
		if l.ID == id {
			return l, nil
		}
	}
	return leagues.League{}, httpx.ErrNotFound
}

func (f *fakeLeagues) GetTournamentByID(_ context.Context, _ auth.Principal, id uuid.UUID) (leagues.Tournament, error) {
	for leagueID, ts := range f.tournaments {
		for _, t := range ts {
			if t.ID == id && !f.hidden[leagueID] {
				return t, nil
			}
		}
	}
	return leagues.Tournament{}, httpx.ErrNotFound
}

func (f *fakeLeagues) ListTournamentsByLeague(_ context.Context, _ auth.Principal, leagueID uuid.UUID, limit, offset int) ([]leagues.Tournament, int, error) {
	if f.hidden[leagueID] {
		return nil, 0, httpx.ErrNotFound
	}
	ts := f.tournaments[leagueID]
	if offset >= len(ts) {
		return nil, len(ts), nil
	}
	return ts[offset:min(offset+limit, len(ts))], len(ts), nil
}

type fakeMatches struct {
	mu      sync.Mutex
	matches []matches.Match
	got     matches.ListMatchesFilter
	sawUser bool
}

func (f *fakeMatches) ListMatches(ctx context.Context, _ uuid.UUID, filters matches.ListMatchesFilter) ([]matches.Match, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.got = filters
	_, f.sawUser = auth.FromContext(ctx)
	ms := f.matches
	if filters.Offset >= len(ms) {
		return nil, nil
	}
	return ms[filters.Offset:min(filters.Offset+filters.Limit, len(ms))], nil
}

type fakeStats struct {
	standings []stats.Standings
	scorers   []stats.TopScorersRow
	err       error
}

func (f *fakeStats) GetStandingsByTournament(context.Context, uuid.UUID) ([]stats.Standings, error) {
	return f.standings, f.err
}

func (f *fakeStats) GetTopScorersByTournament(context.Context, uuid.UUID) ([]stats.TopScorersRow, error) {
	return f.scorers, f.err
}

type fakeTeams struct {
	teams   map[uuid.UUID]teams.Team
	players map[uuid.UUID][]teams.Player
}

func (f *fakeTeams) GetTeam(_ context.Context, id uuid.UUID) (teams.Team, error) {
	t, ok := f.teams[id]
	if !ok {
		return teams.Team{}, httpx.ErrNotFound
	}
	return t, nil
}

func (f *fakeTeams) GetTeamPlayers(_ context.Context, teamID uuid.UUID, _, _ int) ([]teams.Player, error) {
	return f.players[teamID], nil
}

// --- harness ---

type world struct {
	leagues *fakeLeagues
	matches *fakeMatches
	stats   *fakeStats
	teams   *fakeTeams
}

func newWorld() *world {
	return &world{
		leagues: &fakeLeagues{hidden: map[uuid.UUID]bool{}, tournaments: map[uuid.UUID][]leagues.Tournament{}},
		matches: &fakeMatches{},
		stats:   &fakeStats{},
		teams:   &fakeTeams{teams: map[uuid.UUID]teams.Team{}, players: map[uuid.UUID][]teams.Player{}},
	}
}

func connect(t *testing.T, d Deps) *mcp.ClientSession {
	t.Helper()
	ctx := context.Background()
	server := NewServer(d)
	st, ct := mcp.NewInMemoryTransports()
	ss, err := server.Connect(ctx, st, nil)
	if err != nil {
		t.Fatalf("server connect: %v", err)
	}
	t.Cleanup(func() { _ = ss.Close() })
	cs, err := mcp.NewClient(&mcp.Implementation{Name: "test", Version: "1"}, nil).Connect(ctx, ct, nil)
	if err != nil {
		t.Fatalf("client connect: %v", err)
	}
	t.Cleanup(func() { _ = cs.Close() })
	return cs
}

func (w *world) session(t *testing.T) *mcp.ClientSession {
	return connect(t, Deps{Leagues: w.leagues, Matches: w.matches, Stats: w.stats, Teams: w.teams,
		Logger: slog.New(slog.NewTextHandler(io.Discard, nil))})
}

// call runs a tool and decodes its structured output into out. It returns
// the error text when the tool reports an error.
func call(t *testing.T, cs *mcp.ClientSession, name string, args map[string]any, out any) string {
	t.Helper()
	res, err := cs.CallTool(context.Background(), &mcp.CallToolParams{Name: name, Arguments: args})
	if err != nil {
		t.Fatalf("%s: protocol error: %v", name, err)
	}
	if res.IsError {
		return res.Content[0].(*mcp.TextContent).Text
	}
	raw, err := json.Marshal(res.StructuredContent)
	if err != nil {
		t.Fatalf("%s: marshal: %v", name, err)
	}
	if out != nil {
		if err := json.Unmarshal(raw, out); err != nil {
			t.Fatalf("%s: decode %s: %v", name, raw, err)
		}
	}
	return ""
}

func mustFail(t *testing.T, msg, want string) {
	t.Helper()
	if !strings.Contains(msg, want) {
		t.Fatalf("error = %q, want it to contain %q", msg, want)
	}
}

// --- tests ---

func TestCatalogIsReadOnly(t *testing.T) {
	cs := newWorld().session(t)
	res, err := cs.ListTools(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]bool{"search_leagues": true, "get_tournaments": true, "get_matches": true,
		"get_standings": true, "get_top_scorers": true, "get_team": true}
	if len(res.Tools) != len(want) {
		t.Fatalf("got %d tools, want %d", len(res.Tools), len(want))
	}
	for _, tool := range res.Tools {
		if !want[tool.Name] {
			t.Errorf("unexpected tool %q", tool.Name)
		}
		if tool.Annotations == nil || !tool.Annotations.ReadOnlyHint {
			t.Errorf("%s must be annotated read-only", tool.Name)
		}
	}
}

func TestSearchLeagues(t *testing.T) {
	w := newWorld()
	for _, n := range []string{"Liga Pénjamo", "Liga Norte", "Copa PENJAMO Chico", "Liga Sur"} {
		w.leagues.active = append(w.leagues.active, leagues.League{ID: uuid.New(), Name: n, Slug: strings.ToLower(strings.ReplaceAll(n, " ", "-")), AdminID: uuid.New()})
	}
	cs := w.session(t)

	var all LeagueList
	call(t, cs, "search_leagues", map[string]any{"limit": 3}, &all)
	if len(all.Leagues) != 3 || all.Total != 4 || !all.HasMore {
		t.Fatalf("list = %+v", all)
	}

	var found LeagueList
	call(t, cs, "search_leagues", map[string]any{"query": "PENJAMO"}, &found)
	if found.Total != 2 || found.Partial {
		t.Fatalf("accent/case-insensitive search = %+v", found)
	}

	mustFail(t, call(t, cs, "search_leagues", map[string]any{"query": "a"}, nil), "entre 2 y 100")
	mustFail(t, call(t, cs, "search_leagues", map[string]any{"limit": 51}, nil), "limit")
	mustFail(t, call(t, cs, "search_leagues", map[string]any{"offset": -1}, nil), "offset")
}

func TestSearchLeaguesIsBounded(t *testing.T) {
	w := newWorld()
	for i := 0; i < 600; i++ {
		w.leagues.active = append(w.leagues.active, leagues.League{ID: uuid.New(), Name: "Liga", Slug: "liga"})
	}
	var got LeagueList
	call(t, w.session(t), "search_leagues", map[string]any{"query": "liga", "limit": 50}, &got)
	if got.Total != 500 || !got.Partial || len(got.Leagues) != 50 {
		t.Fatalf("got total=%d partial=%v page=%d, want 500/true/50", got.Total, got.Partial, len(got.Leagues))
	}
}

func TestOutputsExcludePrivateFields(t *testing.T) {
	w := newWorld()
	league := leagues.League{ID: uuid.New(), Name: "Liga", Slug: "liga", AdminID: uuid.New(), ProductMode: "full"}
	w.leagues.active = []leagues.League{league}
	team := teams.Team{ID: uuid.New(), Name: "Águilas", LeagueID: league.ID, OwnerID: uuid.New(), IsActive: true}
	w.teams.teams[team.ID] = team
	photo := "https://x/p.jpg"
	w.teams.players[team.ID] = []teams.Player{{ID: uuid.New(), Name: "Ana", JerseyNumber: 9, Position: "Delantera", Photo: &photo, IsActive: true}}
	cs := w.session(t)

	for _, c := range []struct {
		tool string
		args map[string]any
	}{
		{"search_leagues", nil},
		{"get_team", map[string]any{"team_id": team.ID.String()}},
	} {
		res, err := cs.CallTool(context.Background(), &mcp.CallToolParams{Name: c.tool, Arguments: c.args})
		if err != nil || res.IsError {
			t.Fatalf("%s: %v %+v", c.tool, err, res)
		}
		raw, _ := json.Marshal(res)
		for _, private := range []string{"admin_id", "owner_id", "product_mode", "birth_date", "photo", "id_verified", league.AdminID.String(), team.OwnerID.String()} {
			if strings.Contains(string(raw), private) {
				t.Errorf("%s output contains %q: %s", c.tool, private, raw)
			}
		}
	}
}

func TestGetTournamentsHiddenLeague(t *testing.T) {
	w := newWorld()
	hidden := uuid.New()
	w.leagues.hidden[hidden] = true
	cs := w.session(t)

	mustFail(t, call(t, cs, "get_tournaments", map[string]any{"league_id": hidden.String()}, nil), "No encontrado o no es público")
	mustFail(t, call(t, cs, "get_tournaments", map[string]any{"league_id": "1; DROP TABLE"}, nil), "league_id debe ser un UUID")
	mustFail(t, call(t, cs, "get_tournaments", map[string]any{"league_id": uuid.Nil.String()}, nil), "league_id debe ser un UUID")
	if msg := call(t, cs, "get_tournaments", map[string]any{}, nil); msg == "" {
		t.Fatal("missing league_id must be rejected")
	}
}

func TestGetMatches(t *testing.T) {
	w := newWorld()
	league := leagues.League{ID: uuid.New(), Name: "Liga"}
	tour := leagues.Tournament{ID: uuid.New(), LeagueID: league.ID, Name: "Apertura"}
	w.leagues.active = []leagues.League{league}
	w.leagues.tournaments[league.ID] = []leagues.Tournament{tour}
	round := 1
	kickoff := "18:30:00.000000"
	for i, st := range []matches.MatchStatus{matches.MatchStatusFinished, matches.MatchStatusScheduled, matches.MatchStatusScheduled} {
		w.matches.matches = append(w.matches.matches, matches.Match{
			ID: uuid.New(), TournamentID: tour.ID, Status: st, Round: &round, Phase: matches.PhaseRegular,
			HomeScore: 2, AwayScore: i, HomeTeamName: "A", AwayTeamName: "B", MatchDate: time.Now(), MatchTime: &kickoff,
		})
	}
	cs := w.session(t)
	args := func(extra map[string]any) map[string]any {
		m := map[string]any{"tournament_id": tour.ID.String()}
		for k, v := range extra {
			m[k] = v
		}
		return m
	}

	var page MatchList
	call(t, cs, "get_matches", args(map[string]any{"limit": 2}), &page)
	if len(page.Matches) != 2 || !page.HasMore {
		t.Fatalf("page = %+v", page)
	}
	if page.Matches[0].HomeScore == nil || *page.Matches[0].HomeScore != 2 {
		t.Errorf("finished match must carry its score: %+v", page.Matches[0])
	}
	if page.Matches[1].HomeScore != nil {
		t.Errorf("scheduled match must not show 0-0 as a result: %+v", page.Matches[1])
	}
	if page.Matches[0].Time == nil || *page.Matches[0].Time != "18:30" {
		t.Errorf("time = %v, want 18:30", page.Matches[0].Time)
	}
	if w.matches.got.Limit != 3 {
		t.Errorf("service limit = %d, want limit+1", w.matches.got.Limit)
	}
	if w.matches.sawUser {
		t.Error("services must run without an authenticated principal")
	}

	call(t, cs, "get_matches", args(map[string]any{"status": "finished", "round": 3, "phase": "playoffs", "from": "2027-01-10", "to": "2027-01-10"}), &page)
	g := w.matches.got
	if *g.Status != matches.MatchStatusFinished || *g.Round != 3 || *g.Phase != "playoffs" {
		t.Errorf("filters not passed: %+v", g)
	}
	if !g.StartDate.Equal(time.Date(2027, 1, 10, 0, 0, 0, 0, time.UTC)) || g.EndDate.Before(time.Date(2027, 1, 10, 23, 59, 59, 0, time.UTC)) {
		t.Errorf("date range must cover the whole day: %v - %v", g.StartDate, g.EndDate)
	}

	mustFail(t, call(t, cs, "get_matches", args(map[string]any{"status": "deleted"}), nil), "status")
	mustFail(t, call(t, cs, "get_matches", args(map[string]any{"phase": "x"}), nil), "phase")
	mustFail(t, call(t, cs, "get_matches", args(map[string]any{"from": "10/01/2027"}), nil), "YYYY-MM-DD")
	mustFail(t, call(t, cs, "get_matches", args(map[string]any{"from": "2027-02-01", "to": "2027-01-01"}), nil), "anterior")
	mustFail(t, call(t, cs, "get_matches", map[string]any{"tournament_id": uuid.New().String()}, nil), "No encontrado o no es público")
}

func TestInternalErrorsAreNotLeaked(t *testing.T) {
	w := newWorld()
	w.stats.err = errors.New(`pq: relation "secret_table" does not exist`)
	msg := call(t, w.session(t), "get_standings", map[string]any{"tournament_id": uuid.New().String()}, nil)
	mustFail(t, msg, "Error interno")
	if strings.Contains(msg, "secret_table") {
		t.Fatalf("leaked cause: %q", msg)
	}
}

func TestGetStandingsAndTopScorers(t *testing.T) {
	w := newWorld()
	tid := uuid.New()
	w.stats.standings = []stats.Standings{{Position: 1, TeamName: "A", MatchesPlayed: 3, Points: 9}}
	for i := 5; i >= 0; i-- {
		w.stats.scorers = append(w.stats.scorers, stats.TopScorersRow{PlayerName: "P", Goals: int64(i)})
	}
	cs := w.session(t)

	var table StandingsList
	call(t, cs, "get_standings", map[string]any{"tournament_id": tid.String()}, &table)
	if len(table.Standings) != 1 || table.Standings[0].Points != 9 || table.Standings[0].Played != 3 {
		t.Fatalf("standings = %+v", table)
	}

	var top ScorerList
	call(t, cs, "get_top_scorers", map[string]any{"tournament_id": tid.String(), "limit": 3}, &top)
	if len(top.Scorers) != 3 || top.Scorers[0].Goals != 5 || top.Scorers[2].Position != 3 {
		t.Fatalf("top 3 = %+v", top)
	}
	call(t, cs, "get_top_scorers", map[string]any{"tournament_id": tid.String()}, &top)
	if len(top.Scorers) != 5 {
		t.Fatalf("players without goals must be left out: %+v", top)
	}
	mustFail(t, call(t, cs, "get_top_scorers", map[string]any{"tournament_id": tid.String(), "limit": 21}, nil), "limit")
}

func TestGetTeamVisibility(t *testing.T) {
	w := newWorld()
	active := leagues.League{ID: uuid.New(), Name: "Liga"}
	hiddenLeague := uuid.New()
	w.leagues.active = []leagues.League{active}
	w.leagues.hidden[hiddenLeague] = true

	visible := teams.Team{ID: uuid.New(), Name: "A", LeagueID: active.ID, IsActive: true}
	inactive := teams.Team{ID: uuid.New(), Name: "B", LeagueID: active.ID, IsActive: false}
	ofHidden := teams.Team{ID: uuid.New(), Name: "C", LeagueID: hiddenLeague, IsActive: true}
	for _, tm := range []teams.Team{visible, inactive, ofHidden} {
		w.teams.teams[tm.ID] = tm
	}
	w.teams.players[visible.ID] = []teams.Player{
		{Name: "Activo", JerseyNumber: 10, Position: "Medio", IsActive: true},
		{Name: "Baja", JerseyNumber: 11, Position: "Medio", IsActive: false},
	}
	cs := w.session(t)

	var profile TeamProfile
	call(t, cs, "get_team", map[string]any{"team_id": visible.ID.String()}, &profile)
	if profile.League.ID != active.ID.String() || len(profile.Roster) != 1 || profile.Roster[0].Name != "Activo" {
		t.Fatalf("profile = %+v", profile)
	}
	for _, id := range []uuid.UUID{inactive.ID, ofHidden.ID, uuid.New()} {
		mustFail(t, call(t, cs, "get_team", map[string]any{"team_id": id.String()}, nil), "No encontrado o no es público")
	}
}

func TestPublicContextDropsPrincipal(t *testing.T) {
	parent, cancel := context.WithCancel(auth.WithPrincipal(context.Background(), auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}))
	ctx := publicContext(parent)
	if _, ok := auth.FromContext(ctx); ok {
		t.Fatal("principal must not be visible")
	}
	cancel()
	if ctx.Err() == nil {
		t.Fatal("cancellation must propagate")
	}
}
