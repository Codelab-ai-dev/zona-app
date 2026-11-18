//go:build integration

package play

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func playStatus(err error) (int, map[string]string) {
	var he *httpx.Error
	if errors.As(err, &he) {
		return he.Status, he.Fields
	}
	if err == nil {
		return http.StatusOK, nil
	}
	return http.StatusInternalServerError, nil
}

// Every Play item is scoped to one league, authorized on it, and only
// points to resources of that league (#40).
func TestPlayScopeIntegrity(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	a := testdb.Seed(t, pool)
	b := testdb.Seed(t, pool)
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	svc := NewService(NewPGRepository(pool), UnconfiguredProvider{}, authz.NewPGChecker(pool))
	adminA := auth.Principal{UserID: a.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	adminB := auth.Principal{UserID: b.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	super := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true}

	// League A extras: a team that does not play a.MatchID, and a match of
	// another tournament.
	benchTeam := uuid.New()
	exec(`INSERT INTO public.teams (id, name, slug, league_id, tournament_id, owner_id) VALUES ($1, 'Banca FC', $2, $3, $4, $5)`,
		benchTeam, "banca-"+benchTeam.String()[:8], a.LeagueID, a.TournamentID, a.TeamOwnerID)
	otherTournament, otherMatch := uuid.New(), uuid.New()
	exec(`INSERT INTO public.tournaments (id, name, league_id, start_date, end_date) VALUES ($1, 'Clausura', $2, current_date, current_date + 90)`, otherTournament, a.LeagueID)
	exec(`INSERT INTO public.matches (id, tournament_id, home_team_id, away_team_id, match_date, round, status) VALUES ($1, $2, $3, $4, now(), 1, 'scheduled')`,
		otherMatch, otherTournament, a.HomeTeamID, a.AwayTeamID)

	recording := func(t *testing.T, req RecordingRequest) (*Recording, error) {
		t.Helper()
		req.Title, req.SourceType = "Final", "manual"
		return svc.CreateRecording(ctx, adminA, &req)
	}
	rec, err := recording(t, RecordingRequest{LeagueID: &a.LeagueID, TournamentID: &a.TournamentID, MatchID: &a.MatchID})
	if err != nil {
		t.Fatalf("valid recording: %v", err)
	}

	t.Run("recording references", func(t *testing.T) {
		for name, c := range map[string]struct {
			req   RecordingRequest
			field string
		}{
			"match of another league":      {RecordingRequest{LeagueID: &a.LeagueID, MatchID: &b.MatchID}, "match_id"},
			"tournament of another league": {RecordingRequest{LeagueID: &a.LeagueID, TournamentID: &b.TournamentID}, "tournament_id"},
			"match of another tournament":  {RecordingRequest{LeagueID: &a.LeagueID, TournamentID: &a.TournamentID, MatchID: &otherMatch}, "match_id"},
			"unknown match":                {RecordingRequest{LeagueID: &a.LeagueID, MatchID: ptr(uuid.New())}, "match_id"},
		} {
			_, err := recording(t, c.req)
			if code, fields := playStatus(err); code != 422 || fields[c.field] == "" {
				t.Errorf("%s: %d %v, want 422 on %s", name, code, fields, c.field)
			}
		}
	})

	clip := func(caller auth.Principal, req ClipRequest) (*Clip, error) {
		req.Title, req.StartSeconds, req.EndSeconds = "Gol", 10, 20
		return svc.CreateClip(ctx, caller, &req)
	}

	t.Run("clip scope and references", func(t *testing.T) {
		for name, c := range map[string]struct {
			caller auth.Principal
			req    ClipRequest
			want   int
			field  string
		}{
			"no recording and no league":     {adminA, ClipRequest{}, 422, "league_id"},
			"unknown recording":              {adminA, ClipRequest{RecordingID: ptr(uuid.New())}, 422, "recording_id"},
			"recording of A by B's admin":    {adminB, ClipRequest{RecordingID: &rec.ID}, 403, ""},
			"league_id disagrees":            {adminA, ClipRequest{RecordingID: &rec.ID, LeagueID: &b.LeagueID}, 422, "league_id"},
			"match disagrees with recording": {adminA, ClipRequest{RecordingID: &rec.ID, MatchID: &otherMatch}, 422, "match_id"},
			"league B by A's admin":          {adminA, ClipRequest{LeagueID: &b.LeagueID}, 403, ""},
			"team of another league":         {adminA, ClipRequest{LeagueID: &a.LeagueID, TeamID: &b.HomeTeamID}, 422, "team_id"},
			"team that does not play":        {adminA, ClipRequest{RecordingID: &rec.ID, TeamID: &benchTeam}, 422, "team_id"},
			"player of the other team":       {adminA, ClipRequest{RecordingID: &rec.ID, TeamID: &a.AwayTeamID, PlayerID: &a.HomePlayerID}, 422, "player_id"},
			"player of another league":       {adminA, ClipRequest{LeagueID: &a.LeagueID, PlayerID: &b.HomePlayerID}, 422, "player_id"},
		} {
			_, err := clip(c.caller, c.req)
			code, fields := playStatus(err)
			if code != c.want || (c.field != "" && fields[c.field] == "") {
				t.Errorf("%s: %d %v (%v), want %d on %q", name, code, fields, err, c.want, c.field)
			}
		}
	})

	t.Run("valid clip inherits league and match, and B cannot delete it", func(t *testing.T) {
		c, err := clip(adminA, ClipRequest{RecordingID: &rec.ID, TeamID: &a.HomeTeamID, PlayerID: &a.HomePlayerID})
		if err != nil {
			t.Fatalf("valid clip: %v", err)
		}
		if c.LeagueID == nil || *c.LeagueID != a.LeagueID || c.MatchID == nil || *c.MatchID != a.MatchID {
			t.Fatalf("clip scope = league %v match %v", c.LeagueID, c.MatchID)
		}
		if code, _ := playStatus(svc.DeleteClip(ctx, adminB, c.ID)); code != 403 {
			t.Fatalf("B deleting A's clip: %d", code)
		}
		if err := svc.DeleteClip(ctx, adminA, c.ID); err != nil {
			t.Fatalf("A deleting its clip: %v", err)
		}
	})

	t.Run("stream references", func(t *testing.T) {
		_, err := svc.CreateStream(ctx, adminA, &StreamRequest{LeagueID: &a.LeagueID, MatchID: &b.MatchID, Title: "En vivo", SourceType: "obs"})
		if code, fields := playStatus(err); code != 422 || fields["match_id"] == "" {
			t.Fatalf("stream with B's match: %d %v", code, fields)
		}
	})

	t.Run("league-less legacy items: super admin only", func(t *testing.T) {
		orphanRec, orphanClip, orphanStream := uuid.New(), uuid.New(), uuid.New()
		exec(`INSERT INTO public.match_recordings (id, title) VALUES ($1, 'Huérfana')`, orphanRec)
		exec(`INSERT INTO public.video_clips (id, title, start_time_seconds, end_time_seconds) VALUES ($1, 'Huérfano', 0, 5)`, orphanClip)
		exec(`INSERT INTO public.live_streams (id, title) VALUES ($1, 'Huérfana')`, orphanStream)
		title := "Cambio"

		denied := map[string]error{}
		_, denied["update recording"] = svc.UpdateRecording(ctx, adminA, orphanRec, &UpdateRecordingRequest{Title: &title})
		_, denied["refresh recording"] = svc.RefreshRecordingStatus(ctx, adminA, orphanRec)
		denied["delete recording"] = svc.DeleteRecording(ctx, adminA, orphanRec)
		denied["delete clip"] = svc.DeleteClip(ctx, adminA, orphanClip)
		_, denied["update stream"] = svc.UpdateStream(ctx, adminA, orphanStream, &UpdateStreamRequest{Title: &title})
		denied["delete stream"] = svc.DeleteStream(ctx, adminA, orphanStream)
		for op, err := range denied {
			if code, _ := playStatus(err); code != 403 {
				t.Errorf("league admin %s: %d (%v), want 403", op, code, err)
			}
		}

		if _, err := svc.UpdateRecording(ctx, super, orphanRec, &UpdateRecordingRequest{Title: &title}); err != nil {
			t.Errorf("super admin update recording: %v", err)
		}
		if err := svc.DeleteClip(ctx, super, orphanClip); err != nil {
			t.Errorf("super admin delete clip: %v", err)
		}
		if err := svc.DeleteStream(ctx, super, orphanStream); err != nil {
			t.Errorf("super admin delete stream: %v", err)
		}
		if err := svc.DeleteRecording(ctx, super, orphanRec); err != nil {
			t.Errorf("super admin delete recording: %v", err)
		}
	})
}

func ptr[T any](v T) *T { return &v }
