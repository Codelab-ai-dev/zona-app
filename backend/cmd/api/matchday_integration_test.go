//go:build integration

package main

// Matchday rehearsal for the January 2027 launch (issue #41): two independent
// leagues run a football matchday through the real router and database, and
// the admin of league A tries to touch every league B resource it can name.

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/config"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/server"
)

type matchdayAPI struct {
	t       *testing.T
	handler http.Handler
	tokens  *auth.TokenService
	sent    int
}

func newMatchdayAPI(t *testing.T, pool *pgxpool.Pool) *matchdayAPI {
	t.Helper()
	// Optional integrations (storage, WhatsApp, Mux, OpenAI, agent) stay off,
	// as in a January deployment without Zona Play.
	cfg := config.Config{AppURL: "http://localhost", JWTSecret: strings.Repeat("m", 32)}
	tokens := auth.NewTokenService(cfg.JWTSecret, "zona-api", time.Hour)
	modules, err := buildModules(t.Context(), cfg, pool, tokens)
	if err != nil {
		t.Fatal(err)
	}
	handler := server.NewRouter(server.Deps{
		Auth:    auth.NewMiddleware(tokens, auth.NewPGProfileLoader(pool)),
		Health:  http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }),
		Modules: modules,
	})
	return &matchdayAPI{t: t, handler: handler, tokens: tokens}
}

// user creates an account with the given role and returns a bearer token.
func (a *matchdayAPI) user(pool *pgxpool.Pool, role string) (uuid.UUID, string) {
	a.t.Helper()
	ctx := context.Background()
	id := uuid.New()
	email := id.String() + "@matchday.test"
	// The auth.users trigger creates the public.users row with role 'public'.
	if _, err := pool.Exec(ctx, `INSERT INTO auth.users (id, email) VALUES ($1, $2)`, id, email); err != nil {
		a.t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `UPDATE public.users SET role = $2, name = $3 WHERE id = $1`, id, role, "Ensayo "+role); err != nil {
		a.t.Fatal(err)
	}
	token, _, err := a.tokens.Issue(id, email)
	if err != nil {
		a.t.Fatal(err)
	}
	return id, token
}

// do sends a request and returns the status and the decoded JSON body.
func (a *matchdayAPI) do(method, path, token string, body any) (int, map[string]any) {
	a.t.Helper()
	var reader *bytes.Reader
	if body == nil {
		reader = bytes.NewReader(nil)
	} else {
		raw, err := json.Marshal(body)
		if err != nil {
			a.t.Fatal(err)
		}
		reader = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, "/api/v1"+path, reader)
	req.Header.Set("Content-Type", "application/json")
	// The router rate-limits per client IP (burst 40); a rehearsal fires
	// far more requests per second than a person, so spread them out.
	a.sent++
	req.RemoteAddr = fmt.Sprintf("10.41.%d.%d:4100", a.sent/250, a.sent%250+1)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	a.handler.ServeHTTP(rec, req)
	out := map[string]any{}
	if rec.Body.Len() > 0 {
		_ = json.Unmarshal(rec.Body.Bytes(), &out)
	}
	return rec.Code, out
}

// must sends a request that has to answer with the given status.
func (a *matchdayAPI) must(want int, method, path, token string, body any) map[string]any {
	a.t.Helper()
	got, out := a.do(method, path, token, body)
	if got != want {
		a.t.Fatalf("%s %s: status %d, want %d (body %v)", method, path, got, want, out)
	}
	return out
}

func idOf(t *testing.T, obj map[string]any) string {
	t.Helper()
	id, ok := obj["id"].(string)
	if !ok || id == "" {
		t.Fatalf("response without id: %v", obj)
	}
	return id
}

func list(t *testing.T, obj map[string]any) []map[string]any {
	t.Helper()
	raw, ok := obj["data"].([]any)
	if !ok {
		t.Fatalf("response without data list: %v", obj)
	}
	items := make([]map[string]any, len(raw))
	for i, it := range raw {
		items[i] = it.(map[string]any)
	}
	return items
}

// leagueSetup is what one league admin builds through the API.
type leagueSetup struct {
	adminToken   string
	leagueID     string
	tournamentID string
	teamIDs      []string
	players      map[string][]string // team id → player ids
	round1       []map[string]any
}

func (a *matchdayAPI) buildLeague(superToken, adminToken string, adminID uuid.UUID, name string, teams int) leagueSetup {
	a.t.Helper()
	s := leagueSetup{adminToken: adminToken, players: map[string][]string{}}
	slug := "ensayo-" + uuid.NewString()[:8]

	// 1. Super admin creates the league for its admin.
	league := a.must(http.StatusCreated, "POST", "/leagues", superToken, map[string]any{
		"name": name, "slug": slug, "description": "Liga de ensayo", "admin_id": adminID,
	})
	s.leagueID = idOf(a.t, league)

	// 2. The league admin creates a tournament, teams and rosters.
	today := time.Now().Format(time.DateOnly)
	tournament := a.must(http.StatusCreated, "POST", "/tournaments", adminToken, map[string]any{
		"league_id": s.leagueID, "name": "Apertura 2027", "start_date": today,
		"end_date": time.Now().AddDate(0, 4, 0).Format(time.DateOnly), "tournament_format": "league",
	})
	s.tournamentID = idOf(a.t, tournament)

	fixtureTeams := []map[string]any{}
	for i := range teams {
		teamName := fmt.Sprintf("%s Equipo %d", name, i+1)
		team := a.must(http.StatusCreated, "POST", "/teams", adminToken, map[string]any{
			"name": teamName, "slug": fmt.Sprintf("%s-equipo-%d", slug, i+1),
			"league_id": s.leagueID, "tournament_id": s.tournamentID,
		})
		teamID := idOf(a.t, team)
		s.teamIDs = append(s.teamIDs, teamID)
		fixtureTeams = append(fixtureTeams, map[string]any{"id": teamID, "name": teamName})
		for n := 1; n <= 2; n++ {
			player := a.must(http.StatusCreated, "POST", "/teams/"+teamID+"/players", adminToken, map[string]any{
				"name": fmt.Sprintf("Jugador %d-%d", i+1, n), "position": "Delantero", "jersey_number": n * 7,
			})
			s.players[teamID] = append(s.players[teamID], idOf(a.t, player))
		}
	}

	// 3. Generate the round robin and publish round 1.
	a.must(http.StatusCreated, "POST", "/tournaments/"+s.tournamentID+"/fixtures/generate", adminToken, map[string]any{
		"tournament_id": s.tournamentID, "teams": fixtureTeams,
		"schedule": map[string]any{
			"start_date": today, "match_days": []string{"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"},
			"start_time": "09:00", "fields_available": 2, "half_minutes": 20,
			"halftime_break_minutes": 10, "break_between_matches": 10,
		},
	})
	a.must(http.StatusNoContent, "POST", "/tournaments/"+s.tournamentID+"/rounds/1/publish", adminToken,
		map[string]any{"is_published": true})

	all := list(a.t, a.must(http.StatusOK, "GET", "/tournaments/"+s.tournamentID+"/matches?limit=100", "", nil))
	for _, m := range all {
		if r, _ := m["round"].(float64); r == 1 {
			s.round1 = append(s.round1, m)
		}
	}
	if len(s.round1) != teams/2 {
		a.t.Fatalf("%s: round 1 has %d matches, want %d", name, len(s.round1), teams/2)
	}
	for _, m := range s.round1 {
		if m["is_published"] != true {
			a.t.Fatalf("%s: round 1 match %v not published", name, m["id"])
		}
	}
	return s
}

func TestMatchdayRehearsalTwoLeagues(t *testing.T) {
	pool := testdb.Pool(t)
	api := newMatchdayAPI(t, pool)

	_, superToken := api.user(pool, "super_admin")
	adminA, tokenA := api.user(pool, "league_admin")
	adminB, tokenB := api.user(pool, "league_admin")

	a := api.buildLeague(superToken, tokenA, adminA, "Liga A", 4)
	b := api.buildLeague(superToken, tokenB, adminB, "Liga B", 2)

	matchA := a.round1[0]
	matchAID := idOf(t, matchA)
	homeA, awayA := matchA["home_team_id"].(string), matchA["away_team_id"].(string)
	matchBID := idOf(t, b.round1[0])
	teamB := b.teamIDs[0]
	playerB := b.players[teamB][0]

	// 4. QR attendance from the mobile flow (league admin operating the scanner).
	now := time.Now().UTC()
	for _, team := range []string{homeA, awayA} {
		for _, p := range a.players[team] {
			api.must(http.StatusCreated, "POST", "/matches/"+matchAID+"/attendance/qr", tokenA, map[string]any{
				"player_id": p, "confidence_score": 1, "similarity_score": 1, "local_timestamp": now,
			})
		}
	}
	att := list(t, api.must(http.StatusOK, "GET", "/matches/"+matchAID+"/attendance", tokenA, nil))
	if len(att) != 4 {
		t.Fatalf("attendance: %d records, want 4", len(att))
	}

	// 5. Result with scorers and a card.
	scorer, other := a.players[homeA][0], a.players[awayA][0]
	api.must(http.StatusNoContent, "POST", "/matches/"+matchAID+"/result", tokenA, map[string]any{
		"home_score": 2, "away_score": 1,
		"goals": []map[string]any{
			{"player_id": scorer, "team_id": homeA, "minute": 10},
			{"player_id": scorer, "team_id": homeA, "minute": 55},
			{"player_id": other, "team_id": awayA, "minute": 70},
		},
		"cards": []map[string]any{{"player_id": other, "team_id": awayA, "card_type": "yellow", "minute": 30}},
	})

	// 6. Public reads: match, standings and top scorers, without a token.
	m := api.must(http.StatusOK, "GET", "/matches/"+matchAID, "", nil)
	if m["status"] != "finished" || m["home_score"] != 2.0 || m["away_score"] != 1.0 {
		t.Fatalf("public match: %v", m)
	}
	points := map[string]float64{}
	for _, row := range list(t, api.must(http.StatusOK, "GET", "/tournaments/"+a.tournamentID+"/standings", "", nil)) {
		points[row["team_id"].(string)] = row["points"].(float64)
	}
	if points[homeA] != 3 || points[awayA] != 0 {
		t.Fatalf("standings: home %v, away %v; want 3 and 0 (%v)", points[homeA], points[awayA], points)
	}
	for _, id := range b.teamIDs {
		if _, ok := points[id]; ok {
			t.Fatalf("league A standings list league B team %s", id)
		}
	}
	scorers := list(t, api.must(http.StatusOK, "GET", "/tournaments/"+a.tournamentID+"/top-scorers", "", nil))
	if len(scorers) == 0 || scorers[0]["player_id"] != scorer || scorers[0]["goals"] != 2.0 {
		t.Fatalf("top scorers: %v", scorers)
	}

	// 7. Private data needs a token.
	for _, path := range []string{
		"/matches/" + matchAID + "/attendance",
		"/leagues/" + a.leagueID + "/players",
		"/leagues/" + a.leagueID + "/suspensions",
	} {
		api.must(http.StatusUnauthorized, "GET", path, "", nil)
	}

	// 8. League A admin against league B: every attempt is refused.
	refused := func(t *testing.T, method, path string, body any) {
		t.Helper()
		got, out := api.do(method, path, tokenA, body)
		if got != http.StatusForbidden && got != http.StatusNotFound {
			t.Errorf("%s %s by league A admin: status %d, want 403/404 (body %v)", method, path, got, out)
		}
	}
	t.Run("league B resources", func(t *testing.T) {
		refused(t, "PATCH", "/leagues/"+b.leagueID, map[string]any{"name": "Tomada"})
		refused(t, "POST", "/tournaments", map[string]any{
			"league_id": b.leagueID, "name": "Intruso", "start_date": "2027-01-10",
			"end_date": "2027-05-10", "tournament_format": "league",
		})
		refused(t, "PATCH", "/tournaments/"+b.tournamentID, map[string]any{"name": "Tomado"})
		refused(t, "POST", "/teams", map[string]any{"name": "Intruso", "slug": "intruso-" + uuid.NewString()[:8], "league_id": b.leagueID})
		refused(t, "PATCH", "/teams/"+teamB, map[string]any{"name": "Tomado"})
		refused(t, "POST", "/teams/"+teamB+"/players", map[string]any{"name": "Intruso", "position": "Portero", "jersey_number": 1})
		refused(t, "PATCH", "/players/"+playerB, map[string]any{"name": "Tomado"})
		refused(t, "POST", "/tournaments/"+b.tournamentID+"/fixtures/generate", map[string]any{
			"tournament_id": b.tournamentID, "teams": []map[string]any{{"id": b.teamIDs[0], "name": "x"}, {"id": b.teamIDs[1], "name": "y"}},
			"schedule": map[string]any{"start_date": "2027-01-10", "match_days": []string{"sunday"}, "start_time": "09:00",
				"fields_available": 1, "half_minutes": 20, "halftime_break_minutes": 10, "break_between_matches": 10},
		})
		refused(t, "POST", "/tournaments/"+b.tournamentID+"/rounds/1/publish", map[string]any{"is_published": false})
		refused(t, "POST", "/matches/"+matchBID+"/attendance/qr", map[string]any{
			"player_id": playerB, "confidence_score": 1, "similarity_score": 1, "local_timestamp": now,
		})
		refused(t, "POST", "/matches/"+matchBID+"/result", map[string]any{"home_score": 0, "away_score": 5})
		refused(t, "PATCH", "/matches/"+matchBID+"/status", map[string]any{"status": "cancelled"})
		refused(t, "PATCH", "/matches/"+matchBID+"/schedule", map[string]any{"match_time": "23:00"})
		refused(t, "DELETE", "/matches/"+matchBID, nil)
		refused(t, "PUT", "/tournaments/"+b.tournamentID+"/standings/"+teamB, map[string]any{
			"matches_played": 1, "matches_won": 1, "matches_drawn": 0, "matches_lost": 0,
			"goals_for": 9, "goals_against": 0, "reason": "ensayo",
		})
		refused(t, "GET", "/matches/"+matchBID+"/attendance", nil)
		refused(t, "GET", "/leagues/"+b.leagueID+"/players", nil)
		refused(t, "GET", "/leagues/"+b.leagueID+"/suspensions", nil)
	})

	// 9. Mixing IDs: league A resources that point at league B data.
	t.Run("league A resources referencing league B", func(t *testing.T) {
		rejected := func(method, path string, body any) {
			t.Helper()
			got, out := api.do(method, path, tokenA, body)
			if got < 400 || got >= 500 {
				t.Errorf("%s %s by league A admin with league B ids: status %d, want 4xx (body %v)", method, path, got, out)
			}
		}
		matchA2 := idOf(t, a.round1[1])
		rejected("POST", "/matches/"+matchA2+"/attendance/qr", map[string]any{
			"player_id": playerB, "confidence_score": 1, "similarity_score": 1, "local_timestamp": now,
		})
		rejected("POST", "/matches/"+matchA2+"/result", map[string]any{
			"home_score": 1, "away_score": 0,
			"goals": []map[string]any{{"player_id": playerB, "team_id": teamB, "minute": 5}},
		})
		rejected("POST", "/matches", map[string]any{
			"tournament_id": a.tournamentID, "home_team_id": b.teamIDs[0], "away_team_id": b.teamIDs[1],
			"match_date": "2027-01-17T16:00:00Z", "round": 9,
		})
		rejected("POST", "/tournaments/"+a.tournamentID+"/fixtures/generate", map[string]any{
			"tournament_id": a.tournamentID, "teams": []map[string]any{{"id": b.teamIDs[0], "name": "x"}, {"id": b.teamIDs[1], "name": "y"}},
			"schedule": map[string]any{"start_date": "2027-01-10", "match_days": []string{"sunday"}, "start_time": "09:00",
				"fields_available": 1, "half_minutes": 20, "halftime_break_minutes": 10, "break_between_matches": 10},
		})
		rejected("POST", "/tournaments/"+a.tournamentID+"/matches/bulk", map[string]any{
			"tournament_id": a.tournamentID,
			"matches": []map[string]any{{
				"tournament_id": a.tournamentID, "home_team_id": b.teamIDs[0], "away_team_id": b.teamIDs[1],
				"match_date": "2027-01-17T16:00:00Z", "round": 9,
			}},
		})
		rejected("PUT", "/tournaments/"+a.tournamentID+"/standings/"+teamB, map[string]any{
			"matches_played": 1, "matches_won": 1, "matches_drawn": 0, "matches_lost": 0,
			"goals_for": 9, "goals_against": 0, "reason": "ensayo",
		})
		rejected("POST", "/teams", map[string]any{
			"name": "Colado", "slug": "colado-" + uuid.NewString()[:8], "league_id": a.leagueID, "tournament_id": b.tournamentID,
		})
	})

	// 10. League B is untouched.
	mb := api.must(http.StatusOK, "GET", "/matches/"+matchBID, "", nil)
	if mb["status"] != "scheduled" || mb["home_score"] != 0.0 || mb["away_score"] != 0.0 || mb["is_published"] != true {
		t.Errorf("league B match changed: %v", mb)
	}
	if att := list(t, api.must(http.StatusOK, "GET", "/matches/"+matchBID+"/attendance", tokenB, nil)); len(att) != 0 {
		t.Errorf("league B match has %d attendance records, want 0", len(att))
	}
	bMatches := list(t, api.must(http.StatusOK, "GET", "/tournaments/"+b.tournamentID+"/matches?limit=100", "", nil))
	if len(bMatches) != 1 {
		t.Errorf("league B tournament has %d matches, want 1", len(bMatches))
	}
	bTeams := list(t, api.must(http.StatusOK, "GET", "/teams?league_id="+b.leagueID, "", nil))
	if len(bTeams) != 2 {
		t.Errorf("league B has %d teams, want 2", len(bTeams))
	}
	for _, row := range list(t, api.must(http.StatusOK, "GET", "/tournaments/"+b.tournamentID+"/standings", "", nil)) {
		if row["points"] != 0.0 || row["matches_played"] != 0.0 {
			t.Errorf("league B standings changed: %v", row)
		}
	}
}
