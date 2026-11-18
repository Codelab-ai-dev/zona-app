//go:build integration

package play

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// Public clip lists only carry clips of public, ready, non-premium videos
// (or without a video), and the total agrees (#39).
func TestListClipsPlayableOnly(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := context.Background()
	f := testdb.Seed(t, pool)
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	video := func(status, visibility string, premium bool) uuid.UUID {
		id := uuid.New()
		exec(`INSERT INTO public.match_recordings (id, league_id, title, status, visibility, is_premium) VALUES ($1, $2, 'V', $3, $4, $5)`,
			id, f.LeagueID, status, visibility, premium)
		return id
	}
	clip := func(rec *uuid.UUID) uuid.UUID {
		id := uuid.New()
		exec(`INSERT INTO public.video_clips (id, recording_id, league_id, title, start_time_seconds, end_time_seconds) VALUES ($1, $2, $3, 'C', 0, 5)`,
			id, rec, f.LeagueID)
		return id
	}
	ptrTo := func(id uuid.UUID) *uuid.UUID { return &id }

	want := map[uuid.UUID]bool{
		clip(ptrTo(video("ready", "public", false))): true,
		clip(nil): true,
	}
	for _, v := range []uuid.UUID{
		video("ready", "public", true),       // is_premium
		video("ready", "premium", false),     // premium visibility
		video("ready", "unlisted", false),    // link only
		video("ready", "private", false),     // managers only
		video("processing", "public", false), // not ready
	} {
		want[clip(&v)] = false
	}

	repo := NewPGRepository(pool)
	got, total, err := repo.ListClips(ctx, &ListClipsOpts{LeagueID: &f.LeagueID, PlayableOnly: true, Limit: 100})
	if err != nil {
		t.Fatal(err)
	}
	if total != 2 || len(got) != 2 {
		t.Fatalf("total %d, %d clips, want 2", total, len(got))
	}
	for _, c := range got {
		if !want[c.ID] {
			t.Errorf("restricted clip %s listed", c.ID)
		}
	}

	all, total, err := repo.ListClips(ctx, &ListClipsOpts{LeagueID: &f.LeagueID, Limit: 100})
	if err != nil || total != int64(len(want)) || len(all) != len(want) {
		t.Fatalf("managers' list: %d of %d (%v)", len(all), len(want), err)
	}
}
