package play

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

const secretKey = "sk-live-0123456789abcdef"

func keyedStream(league *uuid.UUID) *Stream {
	key := secretKey
	return &Stream{ID: uuid.New(), LeagueID: league, Title: "Final", MuxStreamKey: &key, Status: "idle", SourceType: "obs"}
}

// The broadcast key never appears in a serialized stream (#38).
func TestStreamJSONNeverIncludesKey(t *testing.T) {
	league := uuid.New()
	b, err := json.Marshal(keyedStream(&league))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(b), secretKey) || strings.Contains(string(b), "mux_stream_key") {
		t.Fatalf("stream JSON leaks the key: %s", b)
	}
}

func serve(t *testing.T, h *Handler, method, path string, caller *auth.Principal, body string) *httptest.ResponseRecorder {
	t.Helper()
	r := chi.NewRouter()
	h.Routes(r)
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if caller != nil {
		req = req.WithContext(auth.WithPrincipal(req.Context(), *caller))
	}
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

// Public reads and the create/update responses carry no key, including the
// update of a league-less stream.
func TestStreamResponsesCarryNoKey(t *testing.T) {
	h, repo, _, _ := newTestHandler()
	league := uuid.New()
	stream := keyedStream(&league)
	orphan := keyedStream(nil)
	repo.ListStreamsFunc = func(context.Context, *ListStreamsOpts) ([]*Stream, int64, error) {
		return []*Stream{stream, orphan}, 2, nil
	}
	repo.GetStreamFunc = func(_ context.Context, id uuid.UUID) (*Stream, error) {
		if id == orphan.ID {
			return orphan, nil
		}
		return stream, nil
	}
	repo.CreateStreamFunc = func(context.Context, *StreamRequest, uuid.UUID) (*Stream, error) { return stream, nil }
	repo.UpdateStreamFunc = func(_ context.Context, id uuid.UUID, _ *UpdateStreamRequest) (*Stream, error) { return orphan, nil }
	super := &auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true} // league-less: super admin only (#40)
	admin := &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: true}

	for name, rec := range map[string]*httptest.ResponseRecorder{
		"public list":        serve(t, h, http.MethodGet, "/play/streams", nil, ""),
		"public detail":      serve(t, h, http.MethodGet, "/play/streams/"+stream.ID.String(), nil, ""),
		"create (admin)":     serve(t, h, http.MethodPost, "/play/streams", admin, `{"league_id":"`+league.String()+`","title":"Final","source_type":"obs"}`),
		"update league-less": serve(t, h, http.MethodPatch, "/play/streams/"+orphan.ID.String(), super, `{"title":"Otro"}`),
	} {
		if rec.Code >= 300 {
			t.Errorf("%s: status %d: %s", name, rec.Code, rec.Body)
		}
		if strings.Contains(rec.Body.String(), secretKey) || strings.Contains(rec.Body.String(), "mux_stream_key") {
			t.Errorf("%s leaks the key: %s", name, rec.Body)
		}
	}
}

// Only whoever manages the stream's league gets its key.
func TestGetStreamKey(t *testing.T) {
	league := uuid.New()
	withLeague, orphan := keyedStream(&league), keyedStream(nil)
	keyless := &Stream{ID: uuid.New(), LeagueID: &league, Title: "Sin clave"}
	streams := map[uuid.UUID]*Stream{withLeague.ID: withLeague, orphan.ID: orphan, keyless.ID: keyless}

	admin := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: true}
	other := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: true}
	owner := auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner, IsActive: true}
	super := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true}

	cases := []struct {
		name   string
		caller *auth.Principal
		stream uuid.UUID
		want   int
	}{
		{"anonymous", nil, withLeague.ID, http.StatusUnauthorized},
		{"league admin", &admin, withLeague.ID, http.StatusOK},
		{"admin of another league", &other, withLeague.ID, http.StatusForbidden},
		{"team owner", &owner, withLeague.ID, http.StatusForbidden},
		{"league-less stream, league admin", &admin, orphan.ID, http.StatusForbidden},
		{"league-less stream, super admin", &super, orphan.ID, http.StatusOK},
		{"stream without a key", &admin, keyless.ID, http.StatusNotFound},
		{"unknown stream", &admin, uuid.New(), http.StatusNotFound},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			h, repo, authz, _ := newTestHandler()
			repo.GetStreamFunc = func(_ context.Context, id uuid.UUID) (*Stream, error) { return streams[id], nil }
			authz.CanManageLeagueFunc = func(_ context.Context, p auth.Principal, l uuid.UUID) error {
				if (p.UserID == admin.UserID && l == league) || p.IsSuperAdmin() {
					return nil
				}
				return httpx.ErrForbidden
			}
			rec := serve(t, h, http.MethodGet, "/play/streams/"+c.stream.String()+"/key", c.caller, "")
			if rec.Code != c.want {
				t.Fatalf("status %d, want %d: %s", rec.Code, c.want, rec.Body)
			}
			leaked := strings.Contains(rec.Body.String(), secretKey)
			if leaked != (c.want == http.StatusOK) {
				t.Fatalf("key in body = %v for status %d: %s", leaked, rec.Code, rec.Body)
			}
		})
	}
}
