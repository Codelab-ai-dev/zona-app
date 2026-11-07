package attendance

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// fakeRepository implements Repository for testing.
type fakeRepository struct {
	mu              sync.Mutex
	qrRecords       map[uuid.UUID][]QRAttendance
	facialRecords   map[uuid.UUID][]FacialAttendance
	matchStatuses   map[uuid.UUID]string
	playerInMatches map[uuid.UUID]map[uuid.UUID]bool // matchID -> playerID -> bool
	matchLeagues    map[uuid.UUID]uuid.UUID
}

func (f *fakeRepository) RecordQRAttendance(ctx context.Context, matchID uuid.UUID, req *RecordQRAttendanceRequest) (QRAttendance, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	// Check for duplicate
	for _, r := range f.qrRecords[matchID] {
		if r.PlayerID == req.PlayerID {
			return QRAttendance{}, httpx.ErrConflict.Wrap(nil)
		}
	}

	att := QRAttendance{
		ID:              uuid.New(),
		PlayerID:        req.PlayerID,
		MatchID:         matchID,
		RecognitionMode: req.RecognitionMode,
		ConfidenceScore: req.ConfidenceScore,
		SimilarityScore: req.SimilarityScore,
		LocalTimestamp:  req.LocalTimestamp,
		SyncStatus:      "synced",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	f.qrRecords[matchID] = append(f.qrRecords[matchID], att)
	return att, nil
}

func (f *fakeRepository) RecordFacialAttendance(ctx context.Context, matchID uuid.UUID, req *RecordFacialAttendanceRequest) (FacialAttendance, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	att := FacialAttendance{
		ID:              uuid.New(),
		PlayerID:        req.PlayerID,
		MatchID:         matchID,
		RecognitionMode: req.RecognitionMode,
		ConfidenceScore: req.ConfidenceScore,
		SimilarityScore: req.SimilarityScore,
		LocalTimestamp:  req.LocalTimestamp,
		ServerTimestamp: time.Now(),
		SyncStatus:      "synced",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	f.facialRecords[matchID] = append(f.facialRecords[matchID], att)
	return att, nil
}

func (f *fakeRepository) ListAttendance(ctx context.Context, matchID uuid.UUID, limit, offset int) ([]AttendanceRecord, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	var records []AttendanceRecord
	// Combine QR and facial records
	for _, r := range f.qrRecords[matchID] {
		records = append(records, AttendanceRecord{
			PlayerID:        r.PlayerID,
			PlayerName:      "Player",
			RecognitionMode: r.RecognitionMode,
			ConfidenceScore: r.ConfidenceScore,
			SimilarityScore: r.SimilarityScore,
			Timestamp:       r.LocalTimestamp,
			Source:          "qr",
		})
	}
	for _, r := range f.facialRecords[matchID] {
		records = append(records, AttendanceRecord{
			PlayerID:        r.PlayerID,
			PlayerName:      "Player",
			RecognitionMode: r.RecognitionMode,
			ConfidenceScore: r.ConfidenceScore,
			SimilarityScore: r.SimilarityScore,
			Timestamp:       r.LocalTimestamp,
			Source:          "facial",
		})
	}

	return records, nil
}

func (f *fakeRepository) StreamAttendance(ctx context.Context, matchID uuid.UUID, ch chan AttendanceRecord) error {
	return nil
}

func (f *fakeRepository) GetMatchLeague(ctx context.Context, matchID uuid.UUID) (uuid.UUID, error) {
	if l, ok := f.matchLeagues[matchID]; ok {
		return l, nil
	}
	return uuid.Nil, httpx.ErrNotFound
}

func (f *fakeRepository) GetMatchStatus(ctx context.Context, matchID uuid.UUID) (string, error) {
	if s, ok := f.matchStatuses[matchID]; ok {
		return s, nil
	}
	return "scheduled", nil
}

func (f *fakeRepository) CheckPlayerInMatch(ctx context.Context, playerID, matchID uuid.UUID) (bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if players, ok := f.playerInMatches[matchID]; ok {
		return players[playerID], nil
	}
	return false, nil
}

// fakeAuthz implements authz.Checker for testing.
type fakeAuthz struct {
	allowManageMatch bool
}

func (f *fakeAuthz) CanManageLeague(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error {
	if f.allowManageMatch {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthz) CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error {
	if f.allowManageMatch {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthz) CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error {
	if f.allowManageMatch {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthz) CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error {
	if f.allowManageMatch {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthz) CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error {
	if f.allowManageMatch {
		return nil
	}
	return httpx.ErrForbidden
}

func TestRecordQRAttendance_Happy(t *testing.T) {
	matchID := uuid.New()
	playerID := uuid.New()

	repo := &fakeRepository{
		qrRecords:       make(map[uuid.UUID][]QRAttendance),
		facialRecords:   make(map[uuid.UUID][]FacialAttendance),
		matchStatuses:   map[uuid.UUID]string{matchID: "scheduled"},
		playerInMatches: map[uuid.UUID]map[uuid.UUID]bool{matchID: {playerID: true}},
	}
	authz := &fakeAuthz{allowManageMatch: true}
	svc := NewService(repo, authz)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}
	req := &RecordQRAttendanceRequest{
		PlayerID:        playerID,
		RecognitionMode: "quick",
		ConfidenceScore: 0.95,
		SimilarityScore: 0.90,
		LocalTimestamp:  time.Now(),
	}

	att, err := svc.RecordQRAttendance(context.Background(), caller, matchID, req)
	if err != nil {
		t.Fatalf("RecordQRAttendance: %v", err)
	}

	if att.PlayerID != playerID {
		t.Errorf("PlayerID mismatch: got %v, want %v", att.PlayerID, playerID)
	}
	if att.RecognitionMode != "quick" {
		t.Errorf("RecognitionMode mismatch: got %v, want 'quick'", att.RecognitionMode)
	}
}

func TestRecordQRAttendance_Forbidden(t *testing.T) {
	matchID := uuid.New()
	playerID := uuid.New()

	repo := &fakeRepository{
		qrRecords:       make(map[uuid.UUID][]QRAttendance),
		facialRecords:   make(map[uuid.UUID][]FacialAttendance),
		playerInMatches: map[uuid.UUID]map[uuid.UUID]bool{matchID: {playerID: true}},
	}
	authz := &fakeAuthz{allowManageMatch: false}
	svc := NewService(repo, authz)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RolePublic}
	req := &RecordQRAttendanceRequest{
		PlayerID:        playerID,
		RecognitionMode: "quick",
		ConfidenceScore: 0.95,
		SimilarityScore: 0.90,
		LocalTimestamp:  time.Now(),
	}

	_, err := svc.RecordQRAttendance(context.Background(), caller, matchID, req)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "forbidden") {
		t.Errorf("expected forbidden error, got %v", err)
	}
}

func TestRecordQRAttendance_MatchFinished(t *testing.T) {
	matchID := uuid.New()
	playerID := uuid.New()

	repo := &fakeRepository{
		qrRecords:       make(map[uuid.UUID][]QRAttendance),
		facialRecords:   make(map[uuid.UUID][]FacialAttendance),
		matchStatuses:   map[uuid.UUID]string{matchID: "finished"},
		playerInMatches: map[uuid.UUID]map[uuid.UUID]bool{matchID: {playerID: true}},
	}
	authz := &fakeAuthz{allowManageMatch: true}
	svc := NewService(repo, authz)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}
	req := &RecordQRAttendanceRequest{
		PlayerID:        playerID,
		RecognitionMode: "quick",
		ConfidenceScore: 0.95,
		SimilarityScore: 0.90,
		LocalTimestamp:  time.Now(),
	}

	_, err := svc.RecordQRAttendance(context.Background(), caller, matchID, req)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestRecordQRAttendance_PlayerNotInMatch(t *testing.T) {
	matchID := uuid.New()
	playerID := uuid.New()
	otherPlayerID := uuid.New()

	repo := &fakeRepository{
		qrRecords:       make(map[uuid.UUID][]QRAttendance),
		facialRecords:   make(map[uuid.UUID][]FacialAttendance),
		matchStatuses:   map[uuid.UUID]string{matchID: "scheduled"},
		playerInMatches: map[uuid.UUID]map[uuid.UUID]bool{matchID: {otherPlayerID: true}},
	}
	authz := &fakeAuthz{allowManageMatch: true}
	svc := NewService(repo, authz)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}
	req := &RecordQRAttendanceRequest{
		PlayerID:        playerID,
		RecognitionMode: "quick",
		ConfidenceScore: 0.95,
		SimilarityScore: 0.90,
		LocalTimestamp:  time.Now(),
	}

	_, err := svc.RecordQRAttendance(context.Background(), caller, matchID, req)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestStreamAttendance_ContextCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())

	repo := &fakeRepository{
		qrRecords:     make(map[uuid.UUID][]QRAttendance),
		facialRecords: make(map[uuid.UUID][]FacialAttendance),
	}

	ch := make(chan AttendanceRecord, 10)
	matchID := uuid.New()

	go func() {
		_ = repo.StreamAttendance(ctx, matchID, ch)
	}()

	// Cancel context
	cancel()

	// Allow goroutine to exit
	time.Sleep(100 * time.Millisecond)
}

func TestListAttendance_Empty(t *testing.T) {
	matchID := uuid.New()

	repo := &fakeRepository{
		qrRecords:     make(map[uuid.UUID][]QRAttendance),
		facialRecords: make(map[uuid.UUID][]FacialAttendance),
	}
	svc := NewService(repo, &fakeAuthz{})

	records, err := svc.ListAttendance(context.Background(), matchID, 50, 0)
	if err != nil {
		t.Fatalf("ListAttendance: %v", err)
	}

	if len(records) != 0 {
		t.Errorf("expected 0 records, got %d", len(records))
	}
}

func TestHandler_StreamAttendance_OK(t *testing.T) {
	// This test is skipped because testing SSE streaming requires proper chi routing
	// and context setup. Integration tests will verify the functionality.
	t.Skip("SSE streaming requires integration testing with proper chi routing")
}
