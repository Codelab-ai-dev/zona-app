//go:build integration

package play

import (
	"context"
	"testing"
	"time"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// TestPGRepository_AgainstSchema exercises every query against the real
// schema so column/type mismatches surface before production does.
func TestPGRepository_AgainstSchema(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()
	str := func(s string) *string { return &s }
	num := func(n int) *int { return &n }

	rec, err := repo.CreateRecording(ctx, &RecordingRequest{
		MatchID: &f.MatchID, LeagueID: &f.LeagueID, TournamentID: &f.TournamentID,
		Title: "Final", SourceType: "manual",
	}, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("CreateRecording: %v", err)
	}
	if _, err := repo.GetRecording(ctx, rec.ID); err != nil {
		t.Fatalf("GetRecording: %v", err)
	}
	if _, _, err := repo.ListRecordings(ctx, &ListRecordingsOpts{LeagueID: &f.LeagueID, Status: "ready", Visibility: "public", Limit: 10}); err != nil {
		t.Fatalf("ListRecordings: %v", err)
	}
	if _, err := repo.UpdateRecording(ctx, rec.ID, &UpdateRecordingRequest{
		Title: str("Final editada"), Visibility: str("public"), HomeScore: num(2), AwayScore: num(1),
	}); err != nil {
		t.Fatalf("UpdateRecording: %v", err)
	}

	if err := repo.UpdateRecordingFromMuxUpload(ctx, "upload-1", "asset-1"); err != nil {
		t.Fatalf("UpdateRecordingFromMuxUpload: %v", err)
	}
	if err := repo.UpdateRecordingFromMuxAsset(ctx, "asset-1", "playback-1", 95, "1080p"); err != nil {
		t.Fatalf("UpdateRecordingFromMuxAsset: %v", err)
	}
	if err := repo.UpdateRecordingError(ctx, "asset-unknown", "boom"); err != nil {
		t.Fatalf("UpdateRecordingError: %v", err)
	}

	clip, err := repo.CreateClip(ctx, &ClipRequest{
		RecordingID: &rec.ID, MatchID: &f.MatchID, LeagueID: &f.LeagueID, Title: "Golazo",
		StartSeconds: 10, EndSeconds: 25, PlayerID: &f.HomePlayerID, TeamID: &f.HomeTeamID,
	}, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("CreateClip: %v", err)
	}
	if _, err := repo.GetClip(ctx, clip.ID); err != nil {
		t.Fatalf("GetClip: %v", err)
	}
	for _, sortBy := range []string{"created_at", "views_count", "likes_count", "match_minute"} {
		if _, _, err := repo.ListClips(ctx, &ListClipsOpts{LeagueID: &f.LeagueID, Limit: 10, SortBy: sortBy, SortOrder: "asc"}); err != nil {
			t.Fatalf("ListClips sort=%s: %v", sortBy, err)
		}
	}

	start := time.Now().Add(time.Hour)
	stream, err := repo.CreateStream(ctx, &StreamRequest{
		MatchID: &f.MatchID, LeagueID: &f.LeagueID, Title: "En vivo", SourceType: "obs", ScheduledStart: &start,
	}, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("CreateStream: %v", err)
	}
	if _, err := repo.GetStream(ctx, stream.ID); err != nil {
		t.Fatalf("GetStream: %v", err)
	}
	if _, _, err := repo.ListStreams(ctx, &ListStreamsOpts{LeagueID: &f.LeagueID, Upcoming: true, Limit: 10}); err != nil {
		t.Fatalf("ListStreams: %v", err)
	}
	if _, err := repo.UpdateStream(ctx, stream.ID, &UpdateStreamRequest{Title: str("En vivo 2")}); err != nil {
		t.Fatalf("UpdateStream: %v", err)
	}
	if err := repo.UpdateStreamFromMuxLive(ctx, "mux-live-unknown", "live"); err != nil {
		t.Fatalf("UpdateStreamFromMuxLive: %v", err)
	}

	if err := repo.DeleteClip(ctx, clip.ID); err != nil {
		t.Fatalf("DeleteClip: %v", err)
	}
	if err := repo.DeleteStream(ctx, stream.ID); err != nil {
		t.Fatalf("DeleteStream: %v", err)
	}
	if err := repo.DeleteRecording(ctx, rec.ID); err != nil {
		t.Fatalf("DeleteRecording: %v", err)
	}
}
