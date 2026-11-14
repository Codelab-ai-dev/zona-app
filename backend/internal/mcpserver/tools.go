package mcpserver

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"golang.org/x/text/unicode/norm"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/leagues"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/matches"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

const (
	defaultLimit = 20
	maxLimit     = 50
	maxOffset    = 10000
	// searchPages bounds the leagues scanned by a name search (100 per page),
	// since the leagues service has no name filter.
	searchPages    = 5
	maxTextLen     = 500
	maxRosterSize  = 100
	maxTopScorers  = 20
	minQueryLength = 2
	maxQueryLength = 100
)

// anonymous is the caller for every service call: phase A has no
// authentication, so tools only see what the public portal sees.
var anonymous = auth.Principal{}

type tools struct{ d Deps }

func readOnly(title string) *mcp.ToolAnnotations {
	closed := false
	return &mcp.ToolAnnotations{Title: title, ReadOnlyHint: true, IdempotentHint: true, OpenWorldHint: &closed}
}

func (t *tools) register(s *mcp.Server) {
	mcp.AddTool(s, &mcp.Tool{
		Name:        "search_leagues",
		Description: "Busca ligas activas por nombre o slug. Sin query, lista todas las ligas activas paginadas.",
		Annotations: readOnly("Buscar ligas"),
	}, t.searchLeagues)
	mcp.AddTool(s, &mcp.Tool{
		Name:        "get_tournaments",
		Description: "Lista los torneos de una liga activa.",
		Annotations: readOnly("Torneos de una liga"),
	}, t.getTournaments)
	mcp.AddTool(s, &mcp.Tool{
		Name: "get_matches",
		Description: "Calendario y resultados publicados de un torneo, ordenados por jornada y fecha. " +
			"Filtros opcionales: status (scheduled, in_progress, finished, cancelled), round, phase (regular, playoffs), " +
			"from y to (YYYY-MM-DD). El marcador solo se incluye en partidos en juego o finalizados.",
		Annotations: readOnly("Partidos de un torneo"),
	}, t.getMatches)
	mcp.AddTool(s, &mcp.Tool{
		Name:        "get_standings",
		Description: "Tabla de posiciones de un torneo.",
		Annotations: readOnly("Tabla de posiciones"),
	}, t.getStandings)
	mcp.AddTool(s, &mcp.Tool{
		Name:        "get_top_scorers",
		Description: "Goleadores de un torneo, de más a menos goles (máximo 20).",
		Annotations: readOnly("Goleadores"),
	}, t.getTopScorers)
	mcp.AddTool(s, &mcp.Tool{
		Name:        "get_team",
		Description: "Ficha pública de un equipo activo: liga, torneo y plantel (nombre, número y posición).",
		Annotations: readOnly("Ficha de equipo"),
	}, t.getTeam)
}

// --- inputs ---

// Page is the shared pagination input.
type Page struct {
	Limit  int `json:"limit,omitempty" jsonschema:"resultados por página, de 1 a 50 (20 por omisión)"`
	Offset int `json:"offset,omitempty" jsonschema:"resultados a saltar, de 0 a 10000"`
}

// SearchLeaguesInput is the input of search_leagues.
type SearchLeaguesInput struct {
	Query string `json:"query,omitempty" jsonschema:"texto a buscar en el nombre o slug de la liga (2 a 100 caracteres); vacío lista todas"`
	Page
}

// LeagueIDInput is the input of get_tournaments.
type LeagueIDInput struct {
	LeagueID string `json:"league_id" jsonschema:"UUID de la liga, obtenido con search_leagues"`
	Page
}

// MatchesInput is the input of get_matches.
type MatchesInput struct {
	TournamentID string `json:"tournament_id" jsonschema:"UUID del torneo, obtenido con get_tournaments"`
	Status       string `json:"status,omitempty" jsonschema:"scheduled, in_progress, finished o cancelled"`
	Round        int    `json:"round,omitempty" jsonschema:"número de jornada, mayor que 0"`
	Phase        string `json:"phase,omitempty" jsonschema:"regular o playoffs"`
	From         string `json:"from,omitempty" jsonschema:"fecha mínima YYYY-MM-DD (UTC)"`
	To           string `json:"to,omitempty" jsonschema:"fecha máxima YYYY-MM-DD (UTC), incluida"`
	Page
}

// TournamentIDInput is the input of get_standings.
type TournamentIDInput struct {
	TournamentID string `json:"tournament_id" jsonschema:"UUID del torneo, obtenido con get_tournaments"`
}

// TopScorersInput is the input of get_top_scorers.
type TopScorersInput struct {
	TournamentID string `json:"tournament_id" jsonschema:"UUID del torneo, obtenido con get_tournaments"`
	Limit        int    `json:"limit,omitempty" jsonschema:"cuántos goleadores, de 1 a 20 (10 por omisión)"`
}

// TeamIDInput is the input of get_team.
type TeamIDInput struct {
	TeamID string `json:"team_id" jsonschema:"UUID del equipo, obtenido de get_matches o get_standings"`
}

// --- handlers ---

func (t *tools) searchLeagues(ctx context.Context, _ *mcp.CallToolRequest, in SearchLeaguesInput) (*mcp.CallToolResult, LeagueList, error) {
	ctx = publicContext(ctx)
	limit, offset, err := in.Page.bounds()
	if err != nil {
		return nil, LeagueList{}, err
	}
	query := strings.TrimSpace(in.Query)
	if query == "" {
		ls, total, err := t.d.Leagues.ListActiveLeagues(ctx, limit, offset)
		if err != nil {
			return nil, LeagueList{}, t.fail("search_leagues", err)
		}
		return nil, LeagueList{Leagues: leagueDTOs(ls), Total: total, HasMore: offset+len(ls) < total}, nil
	}
	if n := len([]rune(query)); n < minQueryLength || n > maxQueryLength {
		return nil, LeagueList{}, invalid("query debe tener entre 2 y 100 caracteres")
	}

	needle := fold(query)
	var found []leagues.League
	scanned, total := 0, 0
	for page := 0; page < searchPages; page++ {
		ls, n, err := t.d.Leagues.ListActiveLeagues(ctx, 100, page*100)
		if err != nil {
			return nil, LeagueList{}, t.fail("search_leagues", err)
		}
		total = n
		scanned += len(ls)
		for _, l := range ls {
			if strings.Contains(fold(l.Name), needle) || strings.Contains(fold(l.Slug), needle) {
				found = append(found, l)
			}
		}
		if len(ls) < 100 || scanned >= total {
			break
		}
	}
	out := LeagueList{Total: len(found), Partial: scanned < total}
	if offset < len(found) {
		end := min(offset+limit, len(found))
		out.Leagues = leagueDTOs(found[offset:end])
		out.HasMore = end < len(found)
	} else {
		out.Leagues = []League{}
	}
	return nil, out, nil
}

func (t *tools) getTournaments(ctx context.Context, _ *mcp.CallToolRequest, in LeagueIDInput) (*mcp.CallToolResult, TournamentList, error) {
	ctx = publicContext(ctx)
	leagueID, err := parseID("league_id", in.LeagueID)
	if err != nil {
		return nil, TournamentList{}, err
	}
	limit, offset, err := in.Page.bounds()
	if err != nil {
		return nil, TournamentList{}, err
	}
	ts, total, err := t.d.Leagues.ListTournamentsByLeague(ctx, anonymous, leagueID, limit, offset)
	if err != nil {
		return nil, TournamentList{}, t.fail("get_tournaments", err)
	}
	out := TournamentList{Tournaments: make([]Tournament, 0, len(ts)), Total: total, HasMore: offset+len(ts) < total}
	for _, tr := range ts {
		out.Tournaments = append(out.Tournaments, tournamentDTO(tr))
	}
	return nil, out, nil
}

func (t *tools) getMatches(ctx context.Context, _ *mcp.CallToolRequest, in MatchesInput) (*mcp.CallToolResult, MatchList, error) {
	ctx = publicContext(ctx)
	tournamentID, err := parseID("tournament_id", in.TournamentID)
	if err != nil {
		return nil, MatchList{}, err
	}
	limit, offset, err := in.Page.bounds()
	if err != nil {
		return nil, MatchList{}, err
	}
	// One more than asked, to know whether another page exists.
	filters := matches.ListMatchesFilter{Limit: limit + 1, Offset: offset}
	if err := applyMatchFilters(&filters, in); err != nil {
		return nil, MatchList{}, err
	}
	// A hidden tournament answers "not found" instead of an empty list.
	if _, err := t.d.Leagues.GetTournamentByID(ctx, anonymous, tournamentID); err != nil {
		return nil, MatchList{}, t.fail("get_matches", err)
	}
	ms, err := t.d.Matches.ListMatches(ctx, tournamentID, filters)
	if err != nil {
		return nil, MatchList{}, t.fail("get_matches", err)
	}
	out := MatchList{HasMore: len(ms) > limit}
	if out.HasMore {
		ms = ms[:limit]
	}
	out.Matches = make([]Match, 0, len(ms))
	for _, m := range ms {
		out.Matches = append(out.Matches, matchDTO(m))
	}
	return nil, out, nil
}

func (t *tools) getStandings(ctx context.Context, _ *mcp.CallToolRequest, in TournamentIDInput) (*mcp.CallToolResult, StandingsList, error) {
	ctx = publicContext(ctx)
	tournamentID, err := parseID("tournament_id", in.TournamentID)
	if err != nil {
		return nil, StandingsList{}, err
	}
	rows, err := t.d.Stats.GetStandingsByTournament(ctx, tournamentID)
	if err != nil {
		return nil, StandingsList{}, t.fail("get_standings", err)
	}
	out := StandingsList{Standings: make([]Standing, 0, len(rows))}
	for _, r := range rows {
		out.Standings = append(out.Standings, standingDTO(r))
	}
	return nil, out, nil
}

func (t *tools) getTopScorers(ctx context.Context, _ *mcp.CallToolRequest, in TopScorersInput) (*mcp.CallToolResult, ScorerList, error) {
	ctx = publicContext(ctx)
	tournamentID, err := parseID("tournament_id", in.TournamentID)
	if err != nil {
		return nil, ScorerList{}, err
	}
	limit := in.Limit
	if limit == 0 {
		limit = 10
	}
	if limit < 1 || limit > maxTopScorers {
		return nil, ScorerList{}, invalid("limit debe estar entre 1 y 20")
	}
	rows, err := t.d.Stats.GetTopScorersByTournament(ctx, tournamentID)
	if err != nil {
		return nil, ScorerList{}, t.fail("get_top_scorers", err)
	}
	out := ScorerList{Scorers: make([]Scorer, 0, limit)}
	for _, r := range rows {
		if r.Goals <= 0 || len(out.Scorers) == limit {
			continue
		}
		out.Scorers = append(out.Scorers, Scorer{
			Position: len(out.Scorers) + 1, PlayerID: r.PlayerID.String(), PlayerName: r.PlayerName,
			JerseyNumber: r.JerseyNumber, TeamID: r.TeamID.String(), TeamName: r.TeamName,
			Goals: r.Goals, MatchesPlayed: r.MatchesPlayed,
		})
	}
	return nil, out, nil
}

func (t *tools) getTeam(ctx context.Context, _ *mcp.CallToolRequest, in TeamIDInput) (*mcp.CallToolResult, TeamProfile, error) {
	ctx = publicContext(ctx)
	teamID, err := parseID("team_id", in.TeamID)
	if err != nil {
		return nil, TeamProfile{}, err
	}
	team, err := t.d.Teams.GetTeam(ctx, teamID)
	if err != nil {
		return nil, TeamProfile{}, t.fail("get_team", err)
	}
	// teams.GetTeam does not apply visibility; mirror stats.ensureVisible:
	// inactive teams and teams of hidden leagues are not public.
	if !team.IsActive {
		return nil, TeamProfile{}, t.fail("get_team", httpx.ErrNotFound)
	}
	league, err := t.d.Leagues.GetLeagueByID(ctx, anonymous, team.LeagueID)
	if err != nil {
		return nil, TeamProfile{}, t.fail("get_team", err)
	}
	players, err := t.d.Teams.GetTeamPlayers(ctx, teamID, maxRosterSize, 0)
	if err != nil {
		return nil, TeamProfile{}, t.fail("get_team", err)
	}
	out := TeamProfile{
		ID: team.ID.String(), Name: team.Name, Slug: team.Slug,
		League:       LeagueRef{ID: league.ID.String(), Name: league.Name, Slug: league.Slug},
		TournamentID: idString(team.TournamentID), Logo: team.Logo, Description: clip(team.Description),
		GroupName: team.GroupName, Roster: make([]RosterEntry, 0, len(players)),
	}
	for _, p := range players {
		if p.IsActive {
			out.Roster = append(out.Roster, RosterEntry{Name: p.Name, JerseyNumber: p.JerseyNumber, Position: p.Position})
		}
	}
	return nil, out, nil
}

// --- helpers ---

func (p Page) bounds() (limit, offset int, err error) {
	limit = p.Limit
	if limit == 0 {
		limit = defaultLimit
	}
	if limit < 1 || limit > maxLimit {
		return 0, 0, invalid("limit debe estar entre 1 y 50")
	}
	if p.Offset < 0 || p.Offset > maxOffset {
		return 0, 0, invalid("offset debe estar entre 0 y 10000")
	}
	return limit, p.Offset, nil
}

func applyMatchFilters(f *matches.ListMatchesFilter, in MatchesInput) error {
	switch in.Status {
	case "":
	case "scheduled", "in_progress", "finished", "cancelled":
		st := matches.MatchStatus(in.Status)
		f.Status = &st
	default:
		return invalid("status debe ser scheduled, in_progress, finished o cancelled")
	}
	if in.Round < 0 {
		return invalid("round debe ser mayor que 0")
	}
	if in.Round > 0 {
		r := in.Round
		f.Round = &r
	}
	switch in.Phase {
	case "":
	case string(matches.PhaseRegular), string(matches.PhasePlayoffs):
		ph := in.Phase
		f.Phase = &ph
	default:
		return invalid("phase debe ser regular o playoffs")
	}
	if in.From != "" {
		d, err := time.Parse(time.DateOnly, in.From)
		if err != nil {
			return invalid("from debe tener formato YYYY-MM-DD")
		}
		f.StartDate = &d
	}
	if in.To != "" {
		d, err := time.Parse(time.DateOnly, in.To)
		if err != nil {
			return invalid("to debe tener formato YYYY-MM-DD")
		}
		// Inclusive: everything before the next midnight.
		end := d.Add(24*time.Hour - time.Nanosecond)
		f.EndDate = &end
	}
	if f.StartDate != nil && f.EndDate != nil && f.EndDate.Before(*f.StartDate) {
		return invalid("to no puede ser anterior a from")
	}
	return nil
}

func parseID(field, raw string) (uuid.UUID, error) {
	id, err := uuid.Parse(strings.TrimSpace(raw))
	if err != nil || id == uuid.Nil {
		return uuid.Nil, invalid(field + " debe ser un UUID válido")
	}
	return id, nil
}

// toolError is an error whose message is safe to show to the AI client.
type toolError struct{ msg string }

func (e *toolError) Error() string { return e.msg }

func invalid(msg string) error { return &toolError{msg: "Parámetro inválido: " + msg} }

// fail turns a service error into a message for the client. Hidden and
// missing resources look the same, so their existence is not disclosed;
// internal causes are logged, never returned.
func (t *tools) fail(tool string, err error) error {
	he := httpx.AsError(err)
	switch {
	case he.Status == http.StatusNotFound || he.Status == http.StatusForbidden:
		return &toolError{msg: "No encontrado o no es público."}
	case he.Status < http.StatusInternalServerError:
		return &toolError{msg: he.Message}
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return &toolError{msg: "La consulta se canceló o tardó demasiado."}
	}
	t.d.Logger.Error("mcp tool failed", "tool", tool, "err", err)
	return &toolError{msg: "Error interno. Intenta de nuevo más tarde."}
}

// publicContext keeps cancellation and deadlines but drops every context
// value, so no authenticated principal can reach the services: visibility
// rules always run for an anonymous caller.
func publicContext(ctx context.Context) context.Context { return valuelessContext{ctx} }

type valuelessContext struct{ context.Context }

func (valuelessContext) Value(any) any { return nil }

// fold lowercases and strips accents so "Liga Pénjamo" matches "penjamo".
func fold(s string) string {
	var b strings.Builder
	for _, r := range norm.NFD.String(strings.ToLower(s)) {
		if !unicode.Is(unicode.Mn, r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func clip(s *string) *string {
	if s == nil {
		return nil
	}
	r := []rune(*s)
	if len(r) <= maxTextLen {
		return s
	}
	c := fmt.Sprintf("%s…", string(r[:maxTextLen]))
	return &c
}
