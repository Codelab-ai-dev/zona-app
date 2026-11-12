package notifications

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service sends notifications with business rules and authorization.
type Service struct {
	repo                    Repository
	authz                   authz.Checker
	sender                  Sender
	cfg                     Config
	leagueRateLimitMu       sync.Mutex
	leagueRateLimitTracking map[string]time.Time
	phoneRateLimitMu        sync.Mutex
	phoneRateLimitTracking  map[string][]time.Time
	maxRecipientsPerRequest int
	workerPoolSize          int
}

// NewService builds a notifications service.
func NewService(repo Repository, checker authz.Checker, sender Sender, cfg Config) *Service {
	if cfg.RateLimitMaxPerPhone <= 0 {
		cfg.RateLimitMaxPerPhone = 20
	}
	if cfg.RateLimitWindow <= 0 {
		cfg.RateLimitWindow = time.Hour
	}
	return &Service{
		repo:                    repo,
		authz:                   checker,
		sender:                  sender,
		cfg:                     cfg,
		leagueRateLimitTracking: make(map[string]time.Time),
		phoneRateLimitTracking:  make(map[string][]time.Time),
		maxRecipientsPerRequest: 500,
		workerPoolSize:          5,
	}
}

// SendLeagueNotification sends a template to all users linked to a league.
func (s *Service) SendLeagueNotification(ctx context.Context, caller auth.Principal, leagueID uuid.UUID, req *SendLeagueNotificationRequest) (*Summary, error) {
	// Authorize
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, err
	}

	// Check per-league rate limit
	if !s.checkLeagueRateLimit(leagueID) {
		return nil, httpx.ErrRateLimited.Wrap(fmt.Errorf("league rate limited"))
	}

	// Fetch league, tournament, and match data
	data, err := s.repo.GetLeagueData(ctx, leagueID, req.TournamentID, req.Round)
	if err != nil {
		return nil, err
	}

	// Fetch recipients
	recipients, err := s.repo.GetLeagueRecipients(ctx, leagueID)
	if err != nil {
		return nil, fmt.Errorf("fetch recipients: %w", err)
	}

	if len(recipients) == 0 {
		return &Summary{Sent: 0, Failed: 0, Skipped: 0}, nil
	}

	// Build template payload for jornada (once, reuse for all)
	payload := s.buildJornadaTemplate(data)

	// Send with bounded concurrency, check phone rate limits
	summary := s.sendWithWorkerPool(ctx, recipients, payload)
	return summary, nil
}

// SendMatchFinalized sends result notification for a finalized match.
func (s *Service) SendMatchFinalized(ctx context.Context, caller auth.Principal, matchID uuid.UUID, req *SendMatchFinalizedRequest) (*Summary, error) {
	// Authorize
	if err := s.authz.CanManageMatch(ctx, caller, matchID); err != nil {
		return nil, err
	}

	// Fetch match data
	data, err := s.repo.GetMatchData(ctx, matchID)
	if err != nil {
		return nil, err
	}

	// Fetch league for rate limit
	leagueID := data.LeagueID

	// Check per-league rate limit
	if !s.checkLeagueRateLimit(leagueID) {
		return nil, httpx.ErrRateLimited.Wrap(fmt.Errorf("league rate limited"))
	}

	// Fetch recipients
	recipients, err := s.repo.GetMatchRecipients(ctx, matchID)
	if err != nil {
		return nil, fmt.Errorf("fetch match recipients: %w", err)
	}

	if len(recipients) == 0 {
		return &Summary{Sent: 0, Failed: 0, Skipped: 0}, nil
	}

	// Build template payload for results
	payload := s.buildResultadosTemplate(data)

	// Send with bounded concurrency
	summary := s.sendWithWorkerPool(ctx, recipients, payload)
	return summary, nil
}

// SendTest sends a test message to a verified phone number (super_admin only).
func (s *Service) SendTest(ctx context.Context, caller auth.Principal, phoneNumber string) (*Summary, error) {
	if !caller.IsSuperAdmin() {
		return nil, httpx.ErrForbidden
	}

	// Verify the phone number exists in whatsapp_user_links
	exists, err := s.repo.PhoneNumberExists(ctx, phoneNumber)
	if err != nil {
		return nil, fmt.Errorf("check phone number: %w", err)
	}
	if !exists {
		return nil, httpx.ErrNotFound.Wrap(fmt.Errorf("phone number not registered"))
	}

	// Build a simple test payload
	payload := &TemplatePayload{
		TemplateName: s.cfg.TemplateJornada,
		Language:     "es_MX",
		Components: []TemplateComponent{
			{
				Type: "body",
				Parameters: []TemplateParameter{
					{Type: "text", Text: "Test"},
					{Type: "text", Text: "Test League"},
					{Type: "text", Text: "Test Tournament"},
					{Type: "text", Text: "Team A"},
					{Type: "text", Text: "Team B"},
					{Type: "text", Text: "10:00"},
					{Type: "text", Text: "Test URL"},
				},
			},
		},
	}

	err = s.sender.SendTemplate(ctx, phoneNumber, payload)
	if err != nil {
		return &Summary{Sent: 0, Failed: 1, Skipped: 0}, nil
	}
	return &Summary{Sent: 1, Failed: 0, Skipped: 0}, nil
}

// buildJornadaTemplate builds the jornada (round) notification template with 7 parameters.
func (s *Service) buildJornadaTemplate(data LeagueData) *TemplatePayload {
	var homeTeam, awayTeam, matchTime string
	if len(data.Matches) > 0 {
		homeTeam = data.Matches[0].HomeTeam
		awayTeam = data.Matches[0].AwayTeam
		matchTime = data.Matches[0].Time
	} else {
		homeTeam = "TBD"
		awayTeam = "TBD"
		matchTime = "Por definir"
	}

	// Build tournament URL: {PublicSiteURL}/liga/{leagueSlug}/torneo/{tournamentID}
	tournamentURL := fmt.Sprintf("%s/liga/%s/torneo/%s", s.cfg.PublicSiteURL, data.LeagueSlug, data.TournamentID)
	urlText := fmt.Sprintf("Si quieres ver el resto de la jornada da click en: %s", tournamentURL)

	return &TemplatePayload{
		TemplateName: s.cfg.TemplateJornada,
		Language:     "es_MX",
		Components: []TemplateComponent{
			{
				Type: "body",
				Parameters: []TemplateParameter{
					{Type: "text", Text: strconv.Itoa(data.Round)}, // {{1}} Round
					{Type: "text", Text: data.LeagueName},          // {{2}} League
					{Type: "text", Text: data.TournamentName},      // {{3}} Tournament
					{Type: "text", Text: homeTeam},                 // {{4}} Home team
					{Type: "text", Text: awayTeam},                 // {{5}} Away team
					{Type: "text", Text: matchTime},                // {{6}} Time
					{Type: "text", Text: urlText},                  // {{7}} Tournament URL
				},
			},
		},
	}
}

// buildResultadosTemplate builds the result notification template with header + 6 body parameters.
func (s *Service) buildResultadosTemplate(data MatchData) *TemplatePayload {
	roundStr := strconv.Itoa(data.Round)
	if data.Round == 0 {
		roundStr = "N/A"
	}

	index0 := 0
	return &TemplatePayload{
		TemplateName: s.cfg.TemplateResultados,
		Language:     "es",
		Components: []TemplateComponent{
			{
				Type: "header",
				Parameters: []TemplateParameter{
					{Type: "text", Text: data.TournamentName}, // Header: tournament name
				},
			},
			{
				Type: "body",
				Parameters: []TemplateParameter{
					{Type: "text", Text: roundStr},                     // {{1}} Jornada
					{Type: "text", Text: data.LeagueName},              // {{2}} Liga
					{Type: "text", Text: data.HomeTeam},                // {{3}} Equipo local
					{Type: "text", Text: strconv.Itoa(data.HomeScore)}, // {{4}} Resultado local
					{Type: "text", Text: data.AwayTeam},                // {{5}} Equipo visitante
					{Type: "text", Text: strconv.Itoa(data.AwayScore)}, // {{6}} Resultado visitante
				},
			},
			{
				Type:    "button",
				SubType: "url",
				Index:   &index0,
				Parameters: []TemplateParameter{
					{Type: "text", Text: s.cfg.PublicSiteURL},
				},
			},
		},
	}
}

// sendWithWorkerPool sends to recipients using bounded concurrency and per-phone rate limiting.
func (s *Service) sendWithWorkerPool(ctx context.Context, recipients []Recipient, payload *TemplatePayload) *Summary {
	if len(recipients) > s.maxRecipientsPerRequest {
		slog.InfoContext(ctx, "recipients truncated", "count", len(recipients), "max", s.maxRecipientsPerRequest)
		recipients = recipients[:s.maxRecipientsPerRequest]
	}

	sent := 0
	failed := 0
	skipped := 0
	mu := sync.Mutex{}

	// Create work queue
	jobs := make(chan string, len(recipients))
	wg := sync.WaitGroup{}

	// Spawn worker pool
	for i := 0; i < s.workerPoolSize; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for phone := range jobs {
				// Check phone rate limit before sending
				if !s.checkPhoneRateLimit(phone) {
					mu.Lock()
					skipped++
					mu.Unlock()
					slog.DebugContext(ctx, "phone rate limited", "phone", maskPhoneNumber(phone))
					continue
				}

				if err := s.sender.SendTemplate(ctx, phone, payload); err != nil {
					slog.WarnContext(ctx, "send template failed", "phone", maskPhoneNumber(phone), "err", err)
					mu.Lock()
					failed++
					mu.Unlock()
				} else {
					mu.Lock()
					sent++
					mu.Unlock()
				}
			}
		}()
	}

	// Queue jobs
	for _, r := range recipients {
		jobs <- r.PhoneNumber
	}
	close(jobs)

	wg.Wait()
	return &Summary{Sent: sent, Failed: failed, Skipped: skipped}
}

// checkLeagueRateLimit checks if a league can send messages now.
// Returns true if allowed (under limit or limit expired).
// Per-league cooldown: 60 seconds.
func (s *Service) checkLeagueRateLimit(leagueID uuid.UUID) bool {
	s.leagueRateLimitMu.Lock()
	defer s.leagueRateLimitMu.Unlock()

	key := leagueID.String()
	lastSent, exists := s.leagueRateLimitTracking[key]

	if !exists {
		s.leagueRateLimitTracking[key] = time.Now()
		return true
	}

	if time.Since(lastSent) > 60*time.Second {
		s.leagueRateLimitTracking[key] = time.Now()
		return true
	}

	return false
}

// checkPhoneRateLimit checks per-phone sliding window rate limit.
// Returns true if allowed, false if rate limited.
func (s *Service) checkPhoneRateLimit(phone string) bool {
	s.phoneRateLimitMu.Lock()
	defer s.phoneRateLimitMu.Unlock()

	now := time.Now()
	windowStart := now.Add(-s.cfg.RateLimitWindow)

	// Get existing timestamps for this phone
	timestamps := s.phoneRateLimitTracking[phone]

	// Filter out old timestamps
	var recentTimestamps []time.Time
	for _, ts := range timestamps {
		if ts.After(windowStart) {
			recentTimestamps = append(recentTimestamps, ts)
		}
	}

	// Check if under limit
	if len(recentTimestamps) < s.cfg.RateLimitMaxPerPhone {
		recentTimestamps = append(recentTimestamps, now)
		s.phoneRateLimitTracking[phone] = recentTimestamps
		return true
	}

	// Still at limit; update the list and return false
	s.phoneRateLimitTracking[phone] = recentTimestamps
	return false
}

// maskPhoneNumber returns last 4 digits only for logging.
func maskPhoneNumber(phone string) string {
	if len(phone) <= 4 {
		return "****"
	}
	return "****" + phone[len(phone)-4:]
}

// KapsoHTTPSender sends messages via Kapso API.
type KapsoHTTPSender struct {
	client *http.Client
	cfg    Config
}

// NewKapsoHTTPSender builds an HTTP-based Kapso sender.
func NewKapsoHTTPSender(cfg Config) *KapsoHTTPSender {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	return &KapsoHTTPSender{
		client: client,
		cfg:    cfg,
	}
}

// SendTemplate implements Sender.
func (k *KapsoHTTPSender) SendTemplate(ctx context.Context, to string, payload *TemplatePayload) error {
	if to == "" || payload == nil {
		return fmt.Errorf("recipient and payload required")
	}

	// Normalize phone (remove + if present)
	phone := to
	if len(phone) > 0 && phone[0] == '+' {
		phone = phone[1:]
	}

	// Build Kapso request
	kapsoReq := map[string]interface{}{
		"messaging_product": "whatsapp",
		"to":                phone,
		"type":              "template",
		"template": map[string]interface{}{
			"name": payload.TemplateName,
			"language": map[string]string{
				"code": payload.Language,
			},
			"components": payload.Components,
		},
	}

	body, err := json.Marshal(kapsoReq)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	url := fmt.Sprintf("%s/meta/whatsapp/v21.0/%s/messages", k.cfg.KapsoBaseURL, k.cfg.PhoneNumberID)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("X-API-Key", k.cfg.KapsoAPIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := k.client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		// Read at most 4 KiB of error response (no phone numbers)
		errorBody := io.LimitedReader{R: resp.Body, N: 4096}
		respText, _ := io.ReadAll(&errorBody)
		resp.Body.Close()

		slog.WarnContext(ctx, "kapso api error",
			"status", resp.StatusCode,
			"phone", maskPhoneNumber(phone),
			"response", string(respText))
		return fmt.Errorf("kapso api returned %d", resp.StatusCode)
	}

	slog.DebugContext(ctx, "template sent",
		"phone", maskPhoneNumber(phone),
		"template", payload.TemplateName)
	return nil
}
