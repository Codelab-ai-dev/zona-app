//go:build integration

package attendance

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
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

func TestScannerFlow_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	ctx := context.Background()
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	stranger := auth.Principal{UserID: other.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	day := time.Date(2030, 5, 4, 0, 0, 0, 0, time.UTC)
	if _, err := pool.Exec(ctx, `UPDATE public.matches SET match_date = $2 WHERE id = $1`, f.MatchID, day); err != nil {
		t.Fatal(err)
	}

	list, err := svc.PlayerMatchesOn(ctx, admin, f.HomePlayerID, day)
	if err != nil || len(list) != 1 || list[0].MatchID != f.MatchID || list[0].AlreadyRegistered || list[0].AwayTeamName != "Visita FC" {
		t.Fatalf("matches = %+v %v", list, err)
	}
	if list[0].MatchTime == nil || *list[0].MatchTime != "18:30" {
		t.Fatalf("match time = %v", list[0].MatchTime)
	}
	if list, err := svc.PlayerMatchesOn(ctx, admin, f.HomePlayerID, day.AddDate(0, 0, 1)); err != nil || len(list) != 0 {
		t.Fatalf("next day = %+v %v", list, err)
	}
	if _, err := svc.PlayerMatchesOn(ctx, stranger, f.HomePlayerID, day); err == nil {
		t.Fatal("stranger listed another league's player")
	}

	req := &RecordQRAttendanceRequest{PlayerID: f.HomePlayerID, RecognitionMode: "quick", ConfidenceScore: 1, SimilarityScore: 1, LocalTimestamp: time.Now()}
	if _, err := svc.RecordQRAttendance(ctx, admin, f.MatchID, req); err != nil {
		t.Fatalf("record: %v", err)
	}
	list, _ = svc.PlayerMatchesOn(ctx, admin, f.HomePlayerID, day)
	if len(list) != 1 || !list[0].AlreadyRegistered {
		t.Fatalf("after record = %+v", list)
	}
	// Attendance marks the player as having played, with no fake assists.
	var assists, minutes int
	if err := pool.QueryRow(ctx, `SELECT assists, minutes_played FROM public.player_stats WHERE match_id = $1 AND player_id = $2`,
		f.MatchID, f.HomePlayerID).Scan(&assists, &minutes); err != nil || assists != 0 || minutes != 90 {
		t.Fatalf("player stats = %d assists %d minutes %v", assists, minutes, err)
	}
	var e *httpx.Error
	if _, err := svc.RecordQRAttendance(ctx, admin, f.MatchID, req); !errors.As(err, &e) || e.Status != 409 {
		t.Fatalf("duplicate: got %v, want 409", err)
	}
}

func TestScannerClosedMatch_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool))
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	if _, err := pool.Exec(context.Background(), `UPDATE public.matches SET status = 'cancelled' WHERE id = $1`, f.MatchID); err != nil {
		t.Fatal(err)
	}
	req := &RecordQRAttendanceRequest{PlayerID: f.HomePlayerID, RecognitionMode: "quick", ConfidenceScore: 1, SimilarityScore: 1, LocalTimestamp: time.Now()}
	var e *httpx.Error
	if _, err := svc.RecordQRAttendance(context.Background(), admin, f.MatchID, req); !errors.As(err, &e) || e.Status != 422 {
		t.Fatalf("cancelled match: got %v, want 422", err)
	}
}
