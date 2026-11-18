package play

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Refs are the sports resources a Play item may point to. Nil means "not given".
type Refs struct {
	TournamentID *uuid.UUID
	MatchID      *uuid.UUID
	TeamID       *uuid.UUID
	PlayerID     *uuid.UUID
}

// RefOwners is what the database says about Refs: the league of each
// resource (nil when the ID was not given or does not exist) and the
// links between them.
type RefOwners struct {
	TournamentLeague *uuid.UUID
	MatchLeague      *uuid.UUID
	MatchTournament  *uuid.UUID
	MatchHome        *uuid.UUID
	MatchAway        *uuid.UUID
	TeamLeague       *uuid.UUID
	PlayerLeague     *uuid.UUID
	PlayerTeam       *uuid.UUID
}

// RefOwners implements Repository in one query.
func (r *PGRepository) RefOwners(ctx context.Context, refs Refs) (RefOwners, error) {
	var o RefOwners
	err := r.db.QueryRow(ctx, `
		SELECT
			(SELECT t.league_id FROM public.tournaments t WHERE t.id = $1),
			(SELECT t.league_id FROM public.matches m JOIN public.tournaments t ON t.id = m.tournament_id WHERE m.id = $2),
			(SELECT m.tournament_id FROM public.matches m WHERE m.id = $2),
			(SELECT m.home_team_id FROM public.matches m WHERE m.id = $2),
			(SELECT m.away_team_id FROM public.matches m WHERE m.id = $2),
			(SELECT tm.league_id FROM public.teams tm WHERE tm.id = $3),
			(SELECT tm.league_id FROM public.players p JOIN public.teams tm ON tm.id = p.team_id WHERE p.id = $4),
			(SELECT p.team_id FROM public.players p WHERE p.id = $4)`,
		refs.TournamentID, refs.MatchID, refs.TeamID, refs.PlayerID,
	).Scan(&o.TournamentLeague, &o.MatchLeague, &o.MatchTournament, &o.MatchHome, &o.MatchAway,
		&o.TeamLeague, &o.PlayerLeague, &o.PlayerTeam)
	if err != nil {
		return RefOwners{}, fmt.Errorf("resolve play references: %w", err)
	}
	return o, nil
}

// authorizeLeague is the rule for managing an existing Play item: its
// league's managers, and nobody but a super admin when it has no league
// (league-less rows predate this check; #40).
func (s *Service) authorizeLeague(ctx context.Context, caller auth.Principal, leagueID *uuid.UUID) error {
	if leagueID == nil {
		if caller.IsSuperAdmin() {
			return nil
		}
		return httpx.ErrForbidden
	}
	return s.authz.CanManageLeague(ctx, caller, *leagueID)
}

// checkRefs validates that every referenced resource exists and belongs to
// leagueID, and that the references agree with each other (a match of the
// given tournament, a team that plays the match, a player of the team).
// Mismatches are 422 with one message per field (#40).
func (s *Service) checkRefs(ctx context.Context, leagueID uuid.UUID, refs Refs) error {
	if refs == (Refs{}) {
		return nil
	}
	o, err := s.repo.RefOwners(ctx, refs)
	if err != nil {
		return err
	}
	errs := map[string]string{}
	in := func(field string, given *uuid.UUID, owner *uuid.UUID) bool {
		if given == nil {
			return false
		}
		if owner == nil || *owner != leagueID {
			errs[field] = "no existe o no pertenece a la liga"
			return false
		}
		return true
	}
	tournamentOK := in("tournament_id", refs.TournamentID, o.TournamentLeague)
	matchOK := in("match_id", refs.MatchID, o.MatchLeague)
	teamOK := in("team_id", refs.TeamID, o.TeamLeague)
	playerOK := in("player_id", refs.PlayerID, o.PlayerLeague)

	if tournamentOK && matchOK && *o.MatchTournament != *refs.TournamentID {
		errs["match_id"] = "el partido no es de ese torneo"
	}
	if matchOK && teamOK && *refs.TeamID != *o.MatchHome && *refs.TeamID != *o.MatchAway {
		errs["team_id"] = "el equipo no juega ese partido"
	}
	if playerOK && teamOK && o.PlayerTeam != nil && *o.PlayerTeam != *refs.TeamID {
		errs["player_id"] = "el jugador no es de ese equipo"
	}
	if len(errs) > 0 {
		return httpx.Validation(errs)
	}
	return nil
}
