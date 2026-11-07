package play

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

func newTestHandler() (*Handler, *FakeRepository, *FakeAuthzChecker, *FakeMuxClient) {
	repo := &FakeRepository{}
	authz := &FakeAuthzChecker{}
	provider := &FakeMuxClient{}
	svc := NewService(repo, provider, authz)
	handler := NewHandler(svc, &Config{MuxWebhookSecret: "test-secret"})
	return handler, repo, authz, provider
}

func TestHandlerListRecordings(t *testing.T) {
	handler, repo, _, _ := newTestHandler()

	repo.ListRecordingsFunc = func(ctx context.Context, opts *ListRecordingsOpts) ([]*Recording, int64, error) {
		return []*Recording{
			{ID: uuid.New(), Title: "Video 1", Status: "ready"},
		}, 1, nil
	}

	r := chi.NewRouter()
	handler.Routes(r)

	req := httptest.NewRequest("GET", "/play/videos?limit=10", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.NewDecoder(w.Body).Decode(&resp)
	data, ok := resp["data"].([]interface{})
	if !ok || len(data) != 1 {
		t.Errorf("expected data array with 1 item, got %v", resp["data"])
	}
	page, ok := resp["page"].(map[string]interface{})
	if !ok {
		t.Errorf("expected page object, got %v", resp["page"])
		return
	}
	if page["total"] != float64(1) {
		t.Errorf("expected total 1, got %v", page["total"])
	}
}

func TestHandlerListRecordings_InvalidLimit(t *testing.T) {
	handler, repo, _, _ := newTestHandler()

	repo.ListRecordingsFunc = func(ctx context.Context, opts *ListRecordingsOpts) ([]*Recording, int64, error) {
		return []*Recording{}, 0, nil
	}

	r := chi.NewRouter()
	handler.Routes(r)

	req := httptest.NewRequest("GET", "/play/videos?limit=abc", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected status 422, got %d", w.Code)
	}
}

func TestHandlerListRecordings_EmptyList(t *testing.T) {
	handler, repo, _, _ := newTestHandler()

	repo.ListRecordingsFunc = func(ctx context.Context, opts *ListRecordingsOpts) ([]*Recording, int64, error) {
		return []*Recording{}, 0, nil
	}

	r := chi.NewRouter()
	handler.Routes(r)

	req := httptest.NewRequest("GET", "/play/videos", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.NewDecoder(w.Body).Decode(&resp)
	data, ok := resp["data"].([]interface{})
	if !ok {
		t.Errorf("expected data array, got %v", resp["data"])
		return
	}
	if len(data) != 0 {
		t.Errorf("expected empty data array, got %v", data)
	}
}

func TestHandlerCreateRecording_NoAuth(t *testing.T) {
	handler, _, _, _ := newTestHandler()

	r := chi.NewRouter()
	handler.Routes(r)

	body := bytes.NewBufferString(`{"title":"Test"}`)
	req := httptest.NewRequest("POST", "/play/videos", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestHandlerCreateRecording_Happy(t *testing.T) {
	handler, repo, _, _ := newTestHandler()

	recID := uuid.New()
	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}

	repo.CreateRecordingFunc = func(ctx context.Context, req *RecordingRequest, uploadedBy uuid.UUID) (*Recording, error) {
		return &Recording{
			ID:         recID,
			Title:      req.Title,
			UploadedBy: uploadedBy,
			Status:     "pending",
		}, nil
	}

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := auth.WithPrincipal(r.Context(), caller)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	})
	handler.Routes(r)

	leagueID := uuid.New()
	body := bytes.NewBufferString(fmt.Sprintf(`{"title":"Test Recording","league_id":"%s"}`, leagueID))
	req := httptest.NewRequest("POST", "/play/videos", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["id"] == nil {
		t.Fatal("expected id in response")
	}
	if resp["title"] != "Test Recording" {
		t.Errorf("expected title 'Test Recording', got %v", resp["title"])
	}
}

func TestHandlerGetRecording(t *testing.T) {
	handler, repo, _, _ := newTestHandler()

	recID := uuid.New()
	repo.GetRecordingFunc = func(ctx context.Context, id uuid.UUID) (*Recording, error) {
		if id == recID {
			return &Recording{ID: recID, Title: "Test"}, nil
		}
		return nil, nil
	}

	r := chi.NewRouter()
	handler.Routes(r)

	req := httptest.NewRequest("GET", fmt.Sprintf("/play/videos/%s", recID), nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["id"] == nil {
		t.Fatal("expected id in response")
	}
	if resp["title"] != "Test" {
		t.Errorf("expected title 'Test', got %v", resp["title"])
	}
}

func TestHandlerGetRecording_NotFound(t *testing.T) {
	handler, repo, _, _ := newTestHandler()

	repo.GetRecordingFunc = func(ctx context.Context, id uuid.UUID) (*Recording, error) {
		return nil, nil
	}

	r := chi.NewRouter()
	handler.Routes(r)

	req := httptest.NewRequest("GET", fmt.Sprintf("/play/videos/%s", uuid.New()), nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

func TestHandlerDeleteRecording_NoAuth(t *testing.T) {
	handler, _, _, _ := newTestHandler()

	r := chi.NewRouter()
	handler.Routes(r)

	req := httptest.NewRequest("DELETE", fmt.Sprintf("/play/videos/%s", uuid.New()), nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestHandlerDeleteRecording_Forbidden(t *testing.T) {
	handler, repo, authz, _ := newTestHandler()

	recID := uuid.New()
	leagueID := uuid.New()
	caller := auth.Principal{UserID: uuid.New(), Role: auth.RolePublic}

	repo.GetRecordingFunc = func(ctx context.Context, id uuid.UUID) (*Recording, error) {
		return &Recording{ID: recID, LeagueID: &leagueID}, nil
	}

	authz.CanManageLeagueFunc = func(ctx context.Context, p auth.Principal, id uuid.UUID) error {
		return httpx.ErrForbidden
	}

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := auth.WithPrincipal(r.Context(), caller)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	})
	handler.Routes(r)

	req := httptest.NewRequest("DELETE", fmt.Sprintf("/play/videos/%s", recID), nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected status 403, got %d", w.Code)
	}
}

func TestHandlerListClips(t *testing.T) {
	handler, repo, _, _ := newTestHandler()

	repo.ListClipsFunc = func(ctx context.Context, opts *ListClipsOpts) ([]*Clip, int64, error) {
		return []*Clip{
			{ID: uuid.New(), Title: "Clip 1"},
		}, 1, nil
	}

	r := chi.NewRouter()
	handler.Routes(r)

	req := httptest.NewRequest("GET", "/play/clips", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.NewDecoder(w.Body).Decode(&resp)
	data, ok := resp["data"].([]interface{})
	if !ok || len(data) != 1 {
		t.Errorf("expected data array with 1 item, got %v", resp["data"])
	}
	page, ok := resp["page"].(map[string]interface{})
	if !ok {
		t.Errorf("expected page object, got %v", resp["page"])
		return
	}
	if page["total"] != float64(1) {
		t.Errorf("expected total 1, got %v", page["total"])
	}
}

func TestHandlerCreateClip_NoAuth(t *testing.T) {
	handler, _, _, _ := newTestHandler()

	r := chi.NewRouter()
	handler.Routes(r)

	body := bytes.NewBufferString(`{"title":"Clip","start_time_seconds":0,"end_time_seconds":10}`)
	req := httptest.NewRequest("POST", "/play/clips", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}
}

func TestHandlerListStreams(t *testing.T) {
	handler, repo, _, _ := newTestHandler()

	repo.ListStreamsFunc = func(ctx context.Context, opts *ListStreamsOpts) ([]*Stream, int64, error) {
		return []*Stream{
			{ID: uuid.New(), Title: "Stream 1"},
		}, 1, nil
	}

	r := chi.NewRouter()
	handler.Routes(r)

	req := httptest.NewRequest("GET", "/play/streams", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.NewDecoder(w.Body).Decode(&resp)
	data, ok := resp["data"].([]interface{})
	if !ok || len(data) != 1 {
		t.Errorf("expected data array with 1 item, got %v", resp["data"])
	}
	page, ok := resp["page"].(map[string]interface{})
	if !ok {
		t.Errorf("expected page object, got %v", resp["page"])
		return
	}
	if page["total"] != float64(1) {
		t.Errorf("expected total 1, got %v", page["total"])
	}
}

func TestHandlerWebhookMux_NoSignature(t *testing.T) {
	handler, _, _, _ := newTestHandler()

	r := chi.NewRouter()
	handler.Routes(r)

	body := bytes.NewBufferString(`{}`)
	req := httptest.NewRequest("POST", "/play/webhooks/mux", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestHandlerWebhookMux_BadSignature(t *testing.T) {
	handler, _, _, _ := newTestHandler()

	r := chi.NewRouter()
	handler.Routes(r)

	body := bytes.NewBufferString(`{}`)
	req := httptest.NewRequest("POST", "/play/webhooks/mux", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Mux-Signature", "t=1,v1=badsig")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	// Will fail due to bad timestamp or signature
	if w.Code < 400 {
		t.Errorf("expected error status, got %d", w.Code)
	}
}

func TestHandlerWebhookMux_AssetReady(t *testing.T) {
	handler, repo, _, _ := newTestHandler()
	r := chi.NewRouter()
	handler.Routes(r)

	var gotAsset, gotPlayback string
	repo.UpdateRecordingFromMuxAssetFunc = func(_ context.Context, assetID, playbackID string, _ int, _ string) error {
		gotAsset, gotPlayback = assetID, playbackID
		return nil
	}

	body := `{"type":"video.asset.ready","data":{"id":"asset-1","duration":95.2,"playback_ids":[{"id":"pb-1","policy":"public"}]}}`
	post := func(sig string) int {
		req := httptest.NewRequest("POST", "/play/webhooks/mux", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Mux-Signature", sig)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w.Code
	}

	if code := post(signMux("test-secret", body, time.Now())); code != http.StatusNoContent {
		t.Fatalf("valid webhook status = %d, want 204", code)
	}
	if gotAsset != "asset-1" || gotPlayback != "pb-1" {
		t.Fatalf("recording not updated: asset=%q playback=%q", gotAsset, gotPlayback)
	}

	gotAsset = ""
	if code := post(signMux("attacker", body, time.Now())); code != http.StatusUnauthorized {
		t.Fatalf("forged webhook status = %d, want 401", code)
	}
	if gotAsset != "" {
		t.Fatal("forged webhook reached the repository")
	}

	repo.UpdateRecordingFromMuxAssetFunc = func(context.Context, string, string, int, string) error {
		return errors.New("db down")
	}
	if code := post(signMux("test-secret", body, time.Now())); code != http.StatusInternalServerError {
		t.Fatalf("db failure status = %d, want 500 so Mux retries", code)
	}
}

func TestHandlerInvalidUUID(t *testing.T) {
	handler, _, _, _ := newTestHandler()

	r := chi.NewRouter()
	handler.Routes(r)

	req := httptest.NewRequest("GET", "/play/videos/not-a-uuid", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", w.Code)
	}
}

func TestHandlerCreateRecording_InvalidPayload(t *testing.T) {
	handler, _, _, _ := newTestHandler()

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := auth.WithPrincipal(r.Context(), caller)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	})
	handler.Routes(r)

	body := bytes.NewBufferString(`{"title":""}`)
	req := httptest.NewRequest("POST", "/play/videos", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected status 422, got %d", w.Code)
	}
}
