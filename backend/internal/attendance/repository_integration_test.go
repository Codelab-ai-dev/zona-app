//go:build integration

package attendance

import (
	"context"
	"errors"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// TestRecordQRAttendance_Integration covers the insert, the
// sync_qr_to_player_stats trigger (fixed by migration 00005) and duplicates.
func TestRecordQRAttendance_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	att, err := repo.RecordQRAttendance(ctx, fix.MatchID, &RecordQRAttendanceRequest{PlayerID: fix.HomePlayerID, RecognitionMode: "quick"})
	if err != nil {
		t.Fatalf("RecordQRAttendance: %v", err)
	}
	if att.PlayerID != fix.HomePlayerID || att.MatchID != fix.MatchID {
		t.Fatalf("unexpected record: %+v", att)
	}

	var statsRows int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM public.player_stats WHERE player_id = $1 AND match_id = $2`,
		fix.HomePlayerID, fix.MatchID).Scan(&statsRows); err != nil {
		t.Fatal(err)
	}
	if statsRows != 1 {
		t.Fatalf("trigger should create exactly one player_stats row, got %d", statsRows)
	}

	_, err = repo.RecordQRAttendance(ctx, fix.MatchID, &RecordQRAttendanceRequest{PlayerID: fix.HomePlayerID, RecognitionMode: "quick"})
	if !errors.Is(err, httpx.ErrConflict) {
		t.Fatalf("duplicate err = %v, want conflict", err)
	}
}

func TestRecordFacialAttendance_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	req := &RecordFacialAttendanceRequest{
		PlayerID:        fix.HomePlayerID,
		RecognitionMode: "quick",
		ConfidenceScore: 0.95,
		SimilarityScore: 0.90,
		LocalTimestamp:  time.Now(),
	}

	att, err := repo.RecordFacialAttendance(context.Background(), fix.MatchID, req)
	if err != nil {
		t.Fatalf("RecordFacialAttendance: %v", err)
	}

	if att.PlayerID != fix.HomePlayerID {
		t.Errorf("PlayerID mismatch: got %v, want %v", att.PlayerID, fix.HomePlayerID)
	}
	if att.MatchID != fix.MatchID {
		t.Errorf("MatchID mismatch: got %v, want %v", att.MatchID, fix.MatchID)
	}
	if att.RecognitionMode != "quick" {
		t.Errorf("RecognitionMode mismatch: got %v, want 'quick'", att.RecognitionMode)
	}
}

func TestListAttendance_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	if _, err := repo.RecordQRAttendance(ctx, fix.MatchID, &RecordQRAttendanceRequest{PlayerID: fix.HomePlayerID, RecognitionMode: "quick"}); err != nil {
		t.Fatalf("RecordQRAttendance: %v", err)
	}
	records, err := repo.ListAttendance(ctx, fix.MatchID, 50, 0)
	if err != nil {
		t.Fatalf("ListAttendance: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("got %d records, want 1", len(records))
	}
}

func TestGetMatchLeague_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	leagueID, err := repo.GetMatchLeague(context.Background(), fix.MatchID)
	if err != nil {
		t.Fatalf("GetMatchLeague: %v", err)
	}

	if leagueID != fix.LeagueID {
		t.Errorf("LeagueID mismatch: got %v, want %v", leagueID, fix.LeagueID)
	}
}

func TestGetMatchLeague_NotFound_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	_, err := repo.GetMatchLeague(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected not found error, got nil")
	}
}

func TestGetMatchStatus_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	status, err := repo.GetMatchStatus(context.Background(), fix.MatchID)
	if err != nil {
		t.Fatalf("GetMatchStatus: %v", err)
	}

	if status != "scheduled" {
		t.Errorf("status mismatch: got %v, want 'scheduled'", status)
	}
}

func TestCheckPlayerInMatch_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	inMatch, err := repo.CheckPlayerInMatch(context.Background(), fix.HomePlayerID, fix.MatchID)
	if err != nil {
		t.Fatalf("CheckPlayerInMatch: %v", err)
	}

	if !inMatch {
		t.Error("expected player to be in match")
	}
}

func TestCheckPlayerInMatch_NotInMatch_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	inMatch, err := repo.CheckPlayerInMatch(context.Background(), uuid.New(), fix.MatchID)
	if err != nil {
		t.Fatalf("CheckPlayerInMatch: %v", err)
	}

	if inMatch {
		t.Error("expected player to not be in match")
	}
}
