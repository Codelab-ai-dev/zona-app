// Package mcpserver exposes public, read-only Zona Gol data to AI clients
// through the Model Context Protocol (issue #50, phase A).
//
// Every tool calls the existing domain services as an anonymous caller, so
// the same visibility rules as the public portal apply: inactive leagues,
// hidden tournaments and unpublished matches never reach a tool result.
// Results are mapped to small DTOs declared here, so private fields added to
// domain types later are not exposed by accident.
package mcpserver

import (
	"context"
	"log/slog"

	"github.com/google/uuid"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/leagues"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/matches"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/stats"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/teams"
)

// Version is reported to MCP clients during initialization.
const Version = "0.1.0"

// Leagues is the subset of the leagues service the tools use.
type Leagues interface {
	ListActiveLeagues(ctx context.Context, limit, offset int) ([]leagues.League, int, error)
	GetLeagueByID(ctx context.Context, caller auth.Principal, id uuid.UUID) (leagues.League, error)
	GetTournamentByID(ctx context.Context, caller auth.Principal, id uuid.UUID) (leagues.Tournament, error)
	ListTournamentsByLeague(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, limit, offset int) ([]leagues.Tournament, int, error)
}

// Matches is the subset of the matches service the tools use.
type Matches interface {
	ListMatches(ctx context.Context, tournamentID uuid.UUID, filters matches.ListMatchesFilter) ([]matches.Match, error)
}

// Stats is the subset of the stats service the tools use.
type Stats interface {
	GetStandingsByTournament(ctx context.Context, tournamentID uuid.UUID) ([]stats.Standings, error)
	GetTopScorersByTournament(ctx context.Context, tournamentID uuid.UUID) ([]stats.TopScorersRow, error)
}

// Teams is the subset of the teams service the tools use.
type Teams interface {
	GetTeam(ctx context.Context, teamID uuid.UUID) (teams.Team, error)
	GetTeamPlayers(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]teams.Player, error)
}

// Deps are the domain services behind the tools.
type Deps struct {
	Leagues Leagues
	Matches Matches
	Stats   Stats
	Teams   Teams
	Logger  *slog.Logger
}

// NewServer builds an MCP server with the public read-only tool catalog.
// It is transport-agnostic: callers connect it over stdio, Streamable HTTP
// or in-memory transports (tests).
func NewServer(d Deps) *mcp.Server {
	if d.Logger == nil {
		d.Logger = slog.Default()
	}
	s := mcp.NewServer(&mcp.Implementation{Name: "zona-gol", Title: "Zona Gol", Version: Version}, &mcp.ServerOptions{
		Instructions: "Datos públicos de ligas de fútbol amateur en Zona Gol. Empieza con search_leagues, " +
			"luego get_tournaments con el league_id y usa el tournament_id en get_matches, get_standings y get_top_scorers. " +
			"Solo hay información publicada; no hay datos de contacto ni documentos.",
		Logger: d.Logger,
	})
	t := &tools{d: d}
	t.register(s)
	return s
}
