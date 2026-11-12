package users

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

type fakeRepo struct {
	profiles map[uuid.UUID]Profile
}

func (f fakeRepo) GetByID(_ context.Context, id uuid.UUID) (Profile, error) {
	p, ok := f.profiles[id]
	if !ok {
		return Profile{}, httpx.ErrNotFound
	}
	return p, nil
}

func newTestRouter(repo Repository) chi.Router {
	r := chi.NewRouter()
	NewHandler(NewService(repo)).Routes(r)
	return r
}

func TestMe(t *testing.T) {
	id := uuid.New()
	repo := fakeRepo{profiles: map[uuid.UUID]Profile{id: {ID: id, Name: "Ana", Email: "ana@example.com", Role: "team_owner", IsActive: true}}}

	tests := []struct {
		name       string
		principal  *auth.Principal
		wantStatus int
	}{
		{name: "anonymous is rejected", principal: nil, wantStatus: http.StatusUnauthorized},
		{name: "authenticated gets own profile", principal: &auth.Principal{UserID: id, Role: auth.RoleTeamOwner, IsActive: true}, wantStatus: http.StatusOK},
		{name: "missing profile returns 404", principal: &auth.Principal{UserID: uuid.New(), IsActive: true}, wantStatus: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/me", nil)
			if tt.principal != nil {
				req = req.WithContext(auth.WithPrincipal(req.Context(), *tt.principal))
			}
			rec := httptest.NewRecorder()
			newTestRouter(repo).ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d; body = %s", rec.Code, tt.wantStatus, rec.Body)
			}
			if tt.wantStatus == http.StatusOK {
				var got Profile
				if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
					t.Fatal(err)
				}
				if got.ID != id {
					t.Errorf("id = %s, want %s", got.ID, id)
				}
			}
		})
	}
}
