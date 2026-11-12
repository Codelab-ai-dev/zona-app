package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// fakeAuthz is a test double for authz.Checker.
type fakeAuthz struct {
	canManageLeague bool
	canManageTeam   bool
	canManagePlayer bool
	leagueID        uuid.UUID
	teamID          uuid.UUID
	playerID        uuid.UUID
}

func (f *fakeAuthz) CanManageLeague(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error {
	if p.IsSuperAdmin() {
		return nil
	}
	if f.canManageLeague && leagueID == f.leagueID {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthz) CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error {
	return nil
}

func (f *fakeAuthz) CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error {
	return nil
}

func (f *fakeAuthz) CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error {
	if p.IsSuperAdmin() {
		return nil
	}
	if f.canManageTeam && teamID == f.teamID {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthz) CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error {
	if p.IsSuperAdmin() {
		return nil
	}
	if f.canManagePlayer && playerID == f.playerID {
		return nil
	}
	return httpx.ErrForbidden
}

func newTestRouter(store ObjectStore, checker authz.Checker, cfg Config) chi.Router {
	r := chi.NewRouter()
	svc := NewService(store, checker, cfg)
	NewHandler(svc, nil).Routes(r)
	return r
}

func TestUpload(t *testing.T) {
	leagueID := uuid.New()
	testCases := []struct {
		name           string
		principal      *auth.Principal
		scopeStr       string
		scopeIDStr     string
		fileData       []byte
		expectedStatus int
		checkResult    func(t *testing.T, body []byte)
	}{
		{
			name:           "unauthenticated",
			principal:      nil,
			scopeStr:       "league",
			scopeIDStr:     leagueID.String(),
			fileData:       []byte("\xFF\xD8\xFF\xE0"), // JPEG header
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "happy path league (image)",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			scopeStr:       "league",
			scopeIDStr:     leagueID.String(),
			fileData:       []byte("\xFF\xD8\xFF\xE0"), // JPEG header
			expectedStatus: http.StatusCreated,
			checkResult: func(t *testing.T, body []byte) {
				var resp *UploadResult
				if err := json.Unmarshal(body, &resp); err != nil {
					t.Fatal(err)
				}
				if resp.Key == "" {
					t.Error("expected key in response")
				}
				if !resp.IsPublic {
					t.Error("expected IsPublic=true for league scope")
				}
			},
		},
		{
			name:           "invalid scope",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			scopeStr:       "invalid_scope",
			scopeIDStr:     leagueID.String(),
			fileData:       []byte("\xFF\xD8\xFF\xE0"),
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name:           "invalid scope_id",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			scopeStr:       "league",
			scopeIDStr:     "not-a-uuid",
			fileData:       []byte("\xFF\xD8\xFF\xE0"),
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name:           "unsupported content type",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			scopeStr:       "league",
			scopeIDStr:     leagueID.String(),
			fileData:       []byte("hello world"),
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name:           "app_releases accepts zip (APK)",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin},
			scopeStr:       "app_releases",
			scopeIDStr:     leagueID.String(),
			fileData:       []byte("PK\x03\x04"), // ZIP header
			expectedStatus: http.StatusCreated,
			checkResult: func(t *testing.T, body []byte) {
				var resp *UploadResult
				if err := json.Unmarshal(body, &resp); err != nil {
					t.Fatal(err)
				}
				if !bytes.HasSuffix([]byte(resp.Key), []byte(".apk")) {
					t.Errorf("expected .apk extension for app_releases scope, got %s", resp.Key)
				}
				if resp.IsPublic {
					t.Error("expected IsPublic=false for app_releases scope")
				}
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			store := NewFakeStore()
			checker := &fakeAuthz{
				canManageLeague: true,
				leagueID:        leagueID,
			}
			cfg := Config{
				MaxImageUploadBytes:   10 * 1024 * 1024,
				MaxReleaseUploadBytes: 150 * 1024 * 1024,
				PublicBaseURL:         "https://storage.example.com/bucket",
			}
			router := newTestRouter(store, checker, cfg)

			// Build multipart request
			body := bytes.Buffer{}
			writer := multipart.NewWriter(&body)
			writer.WriteField("scope", tc.scopeStr)
			writer.WriteField("scope_id", tc.scopeIDStr)
			part, _ := writer.CreateFormFile("file", "test.jpg")
			part.Write(tc.fileData)
			writer.Close()

			req := httptest.NewRequest(http.MethodPost, "/storage/objects", &body)
			req.Header.Set("Content-Type", writer.FormDataContentType())

			if tc.principal != nil {
				req = req.WithContext(auth.WithPrincipal(req.Context(), *tc.principal))
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tc.expectedStatus {
				t.Errorf("expected status %d, got %d, body: %s", tc.expectedStatus, w.Code, w.Body.String())
			}

			if tc.checkResult != nil && tc.expectedStatus == http.StatusCreated {
				tc.checkResult(t, w.Body.Bytes())
			}
		})
	}
}

func TestUploadTooLarge(t *testing.T) {
	leagueID := uuid.New()
	store := NewFakeStore()
	checker := &fakeAuthz{
		canManageLeague: true,
		leagueID:        leagueID,
	}
	cfg := Config{
		MaxImageUploadBytes:   1024, // Only 1 KB for images
		MaxReleaseUploadBytes: 150 * 1024 * 1024,
		PublicBaseURL:         "https://storage.example.com/bucket",
	}
	router := newTestRouter(store, checker, cfg)

	// Build multipart request with file larger than limit
	body := bytes.Buffer{}
	writer := multipart.NewWriter(&body)
	writer.WriteField("scope", "league")
	writer.WriteField("scope_id", leagueID.String())
	part, _ := writer.CreateFormFile("file", "test.jpg")
	// Write 10 KB (JPEG header + zeros)
	part.Write([]byte("\xFF\xD8\xFF\xE0"))
	part.Write(make([]byte, 10*1024))
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/storage/objects", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req = req.WithContext(auth.WithPrincipal(req.Context(), auth.Principal{
		UserID: uuid.New(),
		Role:   auth.RoleLeagueAdmin,
	}))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("expected 413, got %d", w.Code)
	}
}

func TestDelete(t *testing.T) {
	leagueID := uuid.New()
	fileID := uuid.New()
	validKey := fmt.Sprintf("league/%s/%s.jpg", leagueID, fileID)

	testCases := []struct {
		name           string
		principal      *auth.Principal
		key            string
		expectedStatus int
	}{
		{
			name:           "unauthenticated",
			principal:      nil,
			key:            validKey,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "happy path",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			key:            validKey,
			expectedStatus: http.StatusNoContent,
		},
		{
			name:           "invalid key format",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			key:            "invalid/format",
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name:           "path traversal attempt",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			key:            fmt.Sprintf("league/%s/../other.jpg", leagueID),
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name:           "foreign league (403)",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			key:            fmt.Sprintf("league/%s/%s.jpg", uuid.New(), uuid.New()),
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			store := NewFakeStore()
			checker := &fakeAuthz{
				canManageLeague: true,
				leagueID:        leagueID,
			}
			cfg := Config{
				MaxImageUploadBytes:   10 * 1024 * 1024,
				MaxReleaseUploadBytes: 150 * 1024 * 1024,
			}
			router := newTestRouter(store, checker, cfg)

			reqBody := DeleteRequest{Key: tc.key}
			body, _ := json.Marshal(reqBody)

			req := httptest.NewRequest(http.MethodDelete, "/storage/objects", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")

			if tc.principal != nil {
				req = req.WithContext(auth.WithPrincipal(req.Context(), *tc.principal))
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tc.expectedStatus {
				t.Errorf("expected status %d, got %d", tc.expectedStatus, w.Code)
			}
		})
	}
}

func TestList(t *testing.T) {
	leagueID := uuid.New()
	testCases := []struct {
		name           string
		principal      *auth.Principal
		scope          string
		scopeID        string
		query          string
		expectedStatus int
		checkResult    func(t *testing.T, body []byte)
	}{
		{
			name:           "unauthenticated",
			principal:      nil,
			scope:          "league",
			scopeID:        leagueID.String(),
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "happy path",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			scope:          "league",
			scopeID:        leagueID.String(),
			expectedStatus: http.StatusOK,
			checkResult: func(t *testing.T, body []byte) {
				var resp map[string]interface{}
				if err := json.Unmarshal(body, &resp); err != nil {
					t.Fatal(err)
				}
				if _, ok := resp["data"]; !ok {
					t.Error("expected data field in response")
				}
				if _, ok := resp["page"]; !ok {
					t.Error("expected page field in response")
				}
			},
		},
		{
			name:           "empty list",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			scope:          "league",
			scopeID:        leagueID.String(),
			expectedStatus: http.StatusOK,
			checkResult: func(t *testing.T, body []byte) {
				var resp map[string]interface{}
				if err := json.Unmarshal(body, &resp); err != nil {
					t.Fatal(err)
				}
				data, ok := resp["data"].([]interface{})
				if !ok {
					t.Errorf("expected data array, got %v", resp["data"])
					return
				}
				if len(data) != 0 {
					t.Errorf("expected empty data array, got %v", data)
				}
			},
		},
		{
			name:           "invalid limit",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			scope:          "league",
			scopeID:        leagueID.String(),
			query:          "?limit=abc&scope=league&scope_id=" + leagueID.String(),
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name:           "invalid scope",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			scope:          "invalid",
			scopeID:        leagueID.String(),
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name:           "foreign league (403)",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			scope:          "league",
			scopeID:        uuid.New().String(),
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			store := NewFakeStore()
			checker := &fakeAuthz{
				canManageLeague: true,
				leagueID:        leagueID,
			}
			cfg := Config{
				MaxImageUploadBytes:   10 * 1024 * 1024,
				MaxReleaseUploadBytes: 150 * 1024 * 1024,
			}
			router := newTestRouter(store, checker, cfg)

			query := tc.query
			if query == "" {
				query = fmt.Sprintf("?scope=%s&scope_id=%s", tc.scope, tc.scopeID)
			}
			req := httptest.NewRequest(http.MethodGet, "/storage/objects"+query, nil)

			if tc.principal != nil {
				req = req.WithContext(auth.WithPrincipal(req.Context(), *tc.principal))
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tc.expectedStatus {
				t.Errorf("expected status %d, got %d", tc.expectedStatus, w.Code)
			}

			if tc.checkResult != nil && tc.expectedStatus == http.StatusOK {
				tc.checkResult(t, w.Body.Bytes())
			}
		})
	}
}

func TestURL(t *testing.T) {
	leagueID := uuid.New()
	fileID := uuid.New()
	validKey := fmt.Sprintf("league/%s/%s.jpg", leagueID, fileID)

	testCases := []struct {
		name           string
		principal      *auth.Principal
		key            string
		expectedStatus int
		checkResult    func(t *testing.T, body []byte)
	}{
		{
			name:           "unauthenticated",
			principal:      nil,
			key:            validKey,
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "public scope returns public URL",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			key:            validKey,
			expectedStatus: http.StatusOK,
			checkResult: func(t *testing.T, body []byte) {
				var resp map[string]string
				if err := json.Unmarshal(body, &resp); err != nil {
					t.Fatal(err)
				}
				if !bytes.HasPrefix([]byte(resp["url"]), []byte("https://storage.example.com/")) {
					t.Errorf("expected public URL, got %s", resp["url"])
				}
			},
		},
		{
			name:           "invalid key format",
			principal:      &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin},
			key:            "invalid/format",
			expectedStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			store := NewFakeStore()
			store.Put(context.Background(), validKey, io.NopCloser(bytes.NewReader([]byte{0xFF, 0xD8})), 2, "image/jpeg")

			checker := &fakeAuthz{
				canManageLeague: true,
				leagueID:        leagueID,
			}
			cfg := Config{
				MaxImageUploadBytes:   10 * 1024 * 1024,
				MaxReleaseUploadBytes: 150 * 1024 * 1024,
				PresignTTL:            7 * 24 * time.Hour,
				PublicBaseURL:         "https://storage.example.com/bucket",
			}
			router := newTestRouter(store, checker, cfg)

			req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/storage/url?key=%s", tc.key), nil)

			if tc.principal != nil {
				req = req.WithContext(auth.WithPrincipal(req.Context(), *tc.principal))
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tc.expectedStatus {
				t.Errorf("expected status %d, got %d", tc.expectedStatus, w.Code)
			}

			if tc.checkResult != nil {
				tc.checkResult(t, w.Body.Bytes())
			}
		})
	}
}

func TestParseKey(t *testing.T) {
	leagueID := uuid.New()
	fileID := uuid.New()

	testCases := []struct {
		name      string
		key       string
		wantScope Scope
		wantID    uuid.UUID
		wantErr   bool
	}{
		{
			name:      "valid league key",
			key:       fmt.Sprintf("league/%s/%s.jpg", leagueID, fileID),
			wantScope: ScopeLeague,
			wantID:    leagueID,
			wantErr:   false,
		},
		{
			name:    "invalid format (no extension)",
			key:     fmt.Sprintf("league/%s/%s", leagueID, fileID),
			wantErr: true,
		},
		{
			name:    "invalid format (wrong number of parts)",
			key:     fmt.Sprintf("league/%s", leagueID),
			wantErr: true,
		},
		{
			name:    "invalid extension",
			key:     fmt.Sprintf("league/%s/%s.exe", leagueID, fileID),
			wantErr: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			scope, id, err := ParseKey(tc.key)
			if tc.wantErr && err == nil {
				t.Errorf("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if !tc.wantErr {
				if scope != tc.wantScope {
					t.Errorf("expected scope %s, got %s", tc.wantScope, scope)
				}
				if id != tc.wantID {
					t.Errorf("expected id %s, got %s", tc.wantID, id)
				}
			}
		})
	}
}
