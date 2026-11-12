package notifications

import (
	"context"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// fakeRepository implements Repository for testing.
type fakeRepository struct {
	leagueRecipients map[uuid.UUID][]Recipient
	matchRecipients  map[uuid.UUID][]Recipient
	leagueData       map[uuid.UUID]LeagueData
	matchData        map[uuid.UUID]MatchData
	matchLeagues     map[uuid.UUID]uuid.UUID
	registeredPhones map[string]bool
}

func (f *fakeRepository) GetLeagueRecipients(ctx context.Context, leagueID uuid.UUID) ([]Recipient, error) {
	if r, ok := f.leagueRecipients[leagueID]; ok {
		return r, nil
	}
	return []Recipient{}, nil
}

func (f *fakeRepository) GetMatchRecipients(ctx context.Context, matchID uuid.UUID) ([]Recipient, error) {
	if r, ok := f.matchRecipients[matchID]; ok {
		return r, nil
	}
	return []Recipient{}, nil
}

func (f *fakeRepository) GetLeagueSlug(ctx context.Context, leagueID uuid.UUID) (string, error) {
	return "test-league", nil
}

func (f *fakeRepository) GetLeagueData(ctx context.Context, leagueID uuid.UUID, tournamentID uuid.UUID, round int) (LeagueData, error) {
	key := leagueID
	if data, ok := f.leagueData[key]; ok {
		return data, nil
	}
	return LeagueData{
		LeagueID:       leagueID,
		LeagueName:     "Test League",
		LeagueSlug:     "test-league",
		TournamentID:   tournamentID,
		TournamentName: "Test Tournament",
		Round:          round,
		Matches: []JornadaMatch{
			{HomeTeam: "Team A", AwayTeam: "Team B", Time: "10:00"},
		},
	}, nil
}

func (f *fakeRepository) GetMatchData(ctx context.Context, matchID uuid.UUID) (MatchData, error) {
	if data, ok := f.matchData[matchID]; ok {
		return data, nil
	}
	return MatchData{
		LeagueID:       uuid.New(),
		LeagueName:     "Test League",
		TournamentName: "Test Tournament",
		Round:          1,
		HomeTeam:       "Team A",
		HomeScore:      2,
		AwayTeam:       "Team B",
		AwayScore:      1,
	}, nil
}

func (f *fakeRepository) GetMatchLeague(ctx context.Context, matchID uuid.UUID) (uuid.UUID, error) {
	if l, ok := f.matchLeagues[matchID]; ok {
		return l, nil
	}
	return uuid.New(), nil
}

func (f *fakeRepository) PhoneNumberExists(ctx context.Context, phoneNumber string) (bool, error) {
	if f.registeredPhones == nil {
		return false, nil
	}
	return f.registeredPhones[phoneNumber], nil
}

// fakeSender implements Sender for testing. The service sends from a worker
// pool, so recording must be synchronized.
type fakeSender struct {
	mu       sync.Mutex
	payloads []TemplatePayload
	failFor  map[string]bool
}

func (f *fakeSender) SendTemplate(ctx context.Context, to string, payload *TemplatePayload) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if payload != nil {
		f.payloads = append(f.payloads, *payload)
	}
	if f.failFor != nil && f.failFor[to] {
		return httpx.ErrInternal
	}
	return nil
}

// fakeChecker implements authz.Checker for testing.
type fakeChecker struct {
	allowLeague bool
	allowMatch  bool
}

func (f *fakeChecker) CanManageLeague(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error {
	if p.IsSuperAdmin() || f.allowLeague {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeChecker) CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error {
	return nil
}

func (f *fakeChecker) CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error {
	if p.IsSuperAdmin() || f.allowMatch {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeChecker) CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error {
	return nil
}

func (f *fakeChecker) CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error {
	return nil
}

func TestSendLeagueNotification_BuildsJornadaTemplate(t *testing.T) {
	leagueID := uuid.New()
	tournamentID := uuid.New()
	repo := &fakeRepository{
		leagueRecipients: map[uuid.UUID][]Recipient{
			leagueID: {{PhoneNumber: "5551234567"}},
		},
		leagueData: map[uuid.UUID]LeagueData{
			leagueID: {
				LeagueID:       leagueID,
				LeagueName:     "Elite League",
				LeagueSlug:     "elite-league",
				TournamentID:   tournamentID,
				TournamentName: "Clausura 2026",
				Round:          5,
				Matches: []JornadaMatch{
					{HomeTeam: "SANTOS", AwayTeam: "ROMA FC", Time: "10:30"},
					{HomeTeam: "Team C", AwayTeam: "Team D", Time: "14:00"},
				},
			},
		},
	}
	checker := &fakeChecker{allowLeague: true}
	sender := &fakeSender{}
	cfg := Config{
		KapsoBaseURL:       "https://api.kapso.ai",
		KapsoAPIKey:        "test-key",
		PhoneNumberID:      "123456",
		TemplateJornada:    "jornadas",
		TemplateResultados: "resultado_jornadas",
		PublicSiteURL:      "https://admin.zona-gol.com",
	}
	svc := NewService(repo, checker, sender, cfg)

	req := &SendLeagueNotificationRequest{
		LeagueID:     leagueID,
		TournamentID: tournamentID,
		Round:        5,
	}

	summary, err := svc.SendLeagueNotification(context.Background(), auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}, leagueID, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if summary.Sent != 1 || summary.Failed != 0 {
		t.Errorf("expected 1 sent, got sent=%d failed=%d", summary.Sent, summary.Failed)
	}

	if len(sender.payloads) != 1 {
		t.Fatalf("expected 1 payload, got %d", len(sender.payloads))
	}

	payload := sender.payloads[0]
	if payload.TemplateName != "jornadas" {
		t.Errorf("expected template jornadas, got %s", payload.TemplateName)
	}
	if payload.Language != "es_MX" {
		t.Errorf("expected language es_MX, got %s", payload.Language)
	}
	if len(payload.Components) != 1 {
		t.Fatalf("expected 1 component, got %d", len(payload.Components))
	}

	body := payload.Components[0]
	if body.Type != "body" {
		t.Errorf("expected body type, got %s", body.Type)
	}
	if len(body.Parameters) != 7 {
		t.Fatalf("expected 7 parameters, got %d", len(body.Parameters))
	}

	// Verify exact parameters
	expectedParams := []string{
		"5",             // Round
		"Elite League",  // League
		"Clausura 2026", // Tournament
		"SANTOS",        // Home team
		"ROMA FC",       // Away team
		"10:30",         // Time
		"Si quieres ver el resto de la jornada da click en: https://admin.zona-gol.com/liga/elite-league/torneo/" + tournamentID.String(), // URL
	}

	for i, param := range body.Parameters {
		if param.Text != expectedParams[i] {
			t.Errorf("parameter %d: expected %q, got %q", i+1, expectedParams[i], param.Text)
		}
	}
}

func TestSendMatchFinalized_BuildsResultadosTemplate(t *testing.T) {
	matchID := uuid.New()
	leagueID := uuid.New()
	repo := &fakeRepository{
		matchRecipients: map[uuid.UUID][]Recipient{
			matchID: {{PhoneNumber: "5551234567"}},
		},
		matchData: map[uuid.UUID]MatchData{
			matchID: {
				LeagueID:       leagueID,
				LeagueName:     "Elite League",
				TournamentName: "Clausura 2026",
				Round:          5,
				HomeTeam:       "SANTOS",
				HomeScore:      2,
				AwayTeam:       "ROMA FC",
				AwayScore:      1,
			},
		},
		matchLeagues: map[uuid.UUID]uuid.UUID{
			matchID: leagueID,
		},
	}
	checker := &fakeChecker{allowMatch: true}
	sender := &fakeSender{}
	cfg := Config{
		KapsoBaseURL:       "https://api.kapso.ai",
		KapsoAPIKey:        "test-key",
		PhoneNumberID:      "123456",
		TemplateJornada:    "jornadas",
		TemplateResultados: "resultado_jornadas",
		PublicSiteURL:      "https://admin.zona-gol.com",
	}
	svc := NewService(repo, checker, sender, cfg)

	req := &SendMatchFinalizedRequest{MatchID: matchID}

	summary, err := svc.SendMatchFinalized(context.Background(), auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}, matchID, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if summary.Sent != 1 || summary.Failed != 0 {
		t.Errorf("expected 1 sent, got sent=%d failed=%d", summary.Sent, summary.Failed)
	}

	if len(sender.payloads) != 1 {
		t.Fatalf("expected 1 payload, got %d", len(sender.payloads))
	}

	payload := sender.payloads[0]
	if payload.TemplateName != "resultado_jornadas" {
		t.Errorf("expected template resultado_jornadas, got %s", payload.TemplateName)
	}
	if payload.Language != "es" {
		t.Errorf("expected language es, got %s", payload.Language)
	}
	if len(payload.Components) != 3 {
		t.Fatalf("expected 3 components (header, body, button), got %d", len(payload.Components))
	}

	// Check header
	header := payload.Components[0]
	if header.Type != "header" {
		t.Errorf("expected header type, got %s", header.Type)
	}
	if header.Parameters[0].Text != "Clausura 2026" {
		t.Errorf("expected header tournament name, got %s", header.Parameters[0].Text)
	}

	// Check body with 6 parameters
	body := payload.Components[1]
	if body.Type != "body" {
		t.Errorf("expected body type, got %s", body.Type)
	}
	if len(body.Parameters) != 6 {
		t.Fatalf("expected 6 body parameters, got %d", len(body.Parameters))
	}

	expectedParams := []string{
		"5",            // Round
		"Elite League", // League
		"SANTOS",       // Home team
		"2",            // Home score
		"ROMA FC",      // Away team
		"1",            // Away score
	}

	for i, param := range body.Parameters {
		if param.Text != expectedParams[i] {
			t.Errorf("parameter %d: expected %q, got %q", i+1, expectedParams[i], param.Text)
		}
	}
}

func TestPhoneRateLimitSlidingWindow(t *testing.T) {
	cfg := Config{
		RateLimitMaxPerPhone: 2,
		RateLimitWindow:      100 * time.Millisecond,
	}
	svc := NewService(&fakeRepository{}, &fakeChecker{}, &fakeSender{}, cfg)

	phone := "5551234567"

	// First two should pass
	if !svc.checkPhoneRateLimit(phone) {
		t.Error("first call should not be rate limited")
	}
	if !svc.checkPhoneRateLimit(phone) {
		t.Error("second call should not be rate limited")
	}

	// Third should fail
	if svc.checkPhoneRateLimit(phone) {
		t.Error("third call should be rate limited")
	}

	// Wait for window to expire
	time.Sleep(120 * time.Millisecond)

	// Should pass again
	if !svc.checkPhoneRateLimit(phone) {
		t.Error("call after window should not be rate limited")
	}
}

func TestPartialFailureAndSkipped(t *testing.T) {
	leagueID := uuid.New()
	tournamentID := uuid.New()
	repo := &fakeRepository{
		leagueRecipients: map[uuid.UUID][]Recipient{
			leagueID: {
				{PhoneNumber: "5551111111"},
				{PhoneNumber: "5552222222"},
				{PhoneNumber: "5553333333"},
			},
		},
	}
	checker := &fakeChecker{allowLeague: true}
	sender := &fakeSender{
		failFor: map[string]bool{
			"5552222222": true, // This one fails
		},
	}
	cfg := Config{
		KapsoBaseURL:         "https://api.kapso.ai",
		KapsoAPIKey:          "test-key",
		PhoneNumberID:        "123456",
		TemplateJornada:      "jornadas",
		TemplateResultados:   "resultado_jornadas",
		PublicSiteURL:        "https://admin.zona-gol.com",
		RateLimitMaxPerPhone: 10,
		RateLimitWindow:      time.Hour,
	}
	svc := NewService(repo, checker, sender, cfg)

	req := &SendLeagueNotificationRequest{
		LeagueID:     leagueID,
		TournamentID: tournamentID,
		Round:        1,
	}

	summary, err := svc.SendLeagueNotification(context.Background(), auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}, leagueID, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if summary.Sent != 2 {
		t.Errorf("expected 2 sent, got %d", summary.Sent)
	}
	if summary.Failed != 1 {
		t.Errorf("expected 1 failed, got %d", summary.Failed)
	}
}

func TestLeagueRateLimit(t *testing.T) {
	cfg := Config{RateLimitMaxPerPhone: 10, RateLimitWindow: time.Hour}
	svc := NewService(&fakeRepository{}, &fakeChecker{}, &fakeSender{}, cfg)

	leagueID := uuid.New()

	// First call should pass
	if !svc.checkLeagueRateLimit(leagueID) {
		t.Error("first league notification should not be rate limited")
	}

	// Immediate second call should fail (60s cooldown)
	if svc.checkLeagueRateLimit(leagueID) {
		t.Error("second call within 60s should be rate limited")
	}
}

func TestMaskPhoneNumber(t *testing.T) {
	tests := []struct {
		phone    string
		expected string
	}{
		{"5551234567", "****4567"},
		{"123", "****"},
		{"", "****"},
		{"12", "****"},
	}

	for _, tt := range tests {
		result := maskPhoneNumber(tt.phone)
		if result != tt.expected {
			t.Errorf("maskPhoneNumber(%q) = %q, want %q", tt.phone, result, tt.expected)
		}
	}
}

func TestValidatePhoneNumber(t *testing.T) {
	tests := []struct {
		phone string
		valid bool
	}{
		{"5551234567", true},
		{"12345678901234", true},
		{"123", false},
		{"123456789012345678", false},
		{"555123456a", false},
		{"+5551234567", false},
		{"", false},
	}

	for _, tt := range tests {
		result := isValidPhoneNumber(tt.phone)
		if result != tt.valid {
			t.Errorf("isValidPhoneNumber(%q) = %v, want %v", tt.phone, result, tt.valid)
		}
	}
}

func TestSendLeagueNotification_Forbidden(t *testing.T) {
	leagueID := uuid.New()
	repo := &fakeRepository{}
	checker := &fakeChecker{allowLeague: false}
	sender := &fakeSender{}
	cfg := Config{
		KapsoBaseURL:       "https://api.kapso.ai",
		KapsoAPIKey:        "test-key",
		PhoneNumberID:      "123456",
		TemplateJornada:    "jornadas",
		TemplateResultados: "resultado_jornadas",
		PublicSiteURL:      "https://admin.zona-gol.com",
	}
	svc := NewService(repo, checker, sender, cfg)

	req := &SendLeagueNotificationRequest{
		LeagueID:     leagueID,
		TournamentID: uuid.New(),
		Round:        1,
	}

	// Non-super-admin should fail
	_, err := svc.SendLeagueNotification(context.Background(), auth.Principal{UserID: uuid.New(), Role: auth.RolePublic}, leagueID, req)
	if err != httpx.ErrForbidden {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestSendTest_SuperAdminOnly(t *testing.T) {
	repo := &fakeRepository{
		registeredPhones: map[string]bool{
			"5551234567": true,
		},
	}
	checker := &fakeChecker{}
	sender := &fakeSender{}
	cfg := Config{
		KapsoBaseURL:       "https://api.kapso.ai",
		KapsoAPIKey:        "test-key",
		PhoneNumberID:      "123456",
		TemplateJornada:    "jornadas",
		TemplateResultados: "resultado_jornadas",
		PublicSiteURL:      "https://admin.zona-gol.com",
	}
	svc := NewService(repo, checker, sender, cfg)

	// Non-super-admin should fail
	_, err := svc.SendTest(context.Background(), auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}, "5551234567")
	if err != httpx.ErrForbidden {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestRequestValidation(t *testing.T) {
	tests := []struct {
		name   string
		req    SendLeagueNotificationRequest
		hasErr bool
	}{
		{
			name: "valid",
			req: SendLeagueNotificationRequest{
				LeagueID:     uuid.New(),
				TournamentID: uuid.New(),
				Round:        1,
			},
			hasErr: false,
		},
		{
			name: "missing league id",
			req: SendLeagueNotificationRequest{
				TournamentID: uuid.New(),
				Round:        1,
			},
			hasErr: true,
		},
		{
			name: "zero round",
			req: SendLeagueNotificationRequest{
				LeagueID:     uuid.New(),
				TournamentID: uuid.New(),
				Round:        0,
			},
			hasErr: true,
		},
	}

	for _, tt := range tests {
		errs := tt.req.Validate()
		if (len(errs) > 0) != tt.hasErr {
			t.Errorf("%s: validation errors = %v, want errors = %v", tt.name, len(errs) > 0, tt.hasErr)
		}
	}
}

func TestRecipientTruncation(t *testing.T) {
	leagueID := uuid.New()
	tournamentID := uuid.New()

	// Create 600 recipients (exceeds 500 limit)
	recipients := make([]Recipient, 600)
	for i := 0; i < 600; i++ {
		recipients[i] = Recipient{PhoneNumber: strconv.Itoa(i)}
	}

	repo := &fakeRepository{
		leagueRecipients: map[uuid.UUID][]Recipient{
			leagueID: recipients,
		},
	}
	checker := &fakeChecker{allowLeague: true}
	sender := &fakeSender{}
	cfg := Config{
		KapsoBaseURL:         "https://api.kapso.ai",
		KapsoAPIKey:          "test-key",
		PhoneNumberID:        "123456",
		TemplateJornada:      "jornadas",
		TemplateResultados:   "resultado_jornadas",
		PublicSiteURL:        "https://admin.zona-gol.com",
		RateLimitMaxPerPhone: 10,
		RateLimitWindow:      time.Hour,
	}
	svc := NewService(repo, checker, sender, cfg)

	req := &SendLeagueNotificationRequest{
		LeagueID:     leagueID,
		TournamentID: tournamentID,
		Round:        1,
	}

	summary, _ := svc.SendLeagueNotification(context.Background(), auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}, leagueID, req)

	// Should only send to first 500
	if summary.Sent != 500 {
		t.Errorf("expected 500 sent, got %d", summary.Sent)
	}
}
