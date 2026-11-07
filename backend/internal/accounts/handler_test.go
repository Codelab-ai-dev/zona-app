package accounts

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
)

func newTestRouter(svc *Service) chi.Router {
	r := chi.NewRouter()
	NewHandler(svc).Routes(r)
	return r
}

func TestCreateUserHandler(t *testing.T) {
	leagueID := uuid.New()
	validEmail := "test@example.com"
	validPassword := "validpassword123"
	validName := "Test User"

	tests := []struct {
		name       string
		principal  *auth.Principal
		body       CreateUserRequest
		wantStatus int
		checkResp  func(t *testing.T, body []byte)
	}{
		{
			name:       "anonymous is rejected",
			principal:  nil,
			body:       CreateUserRequest{Email: validEmail, Password: validPassword, Name: validName, Role: "team_owner"},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "team_owner is rejected",
			principal:  &auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner, IsActive: true},
			body:       CreateUserRequest{Email: validEmail, Password: validPassword, Name: validName, Role: "team_owner"},
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "invalid email returns 422",
			principal:  &auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true},
			body:       CreateUserRequest{Email: "invalid", Password: validPassword, Name: validName, Role: "team_owner"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "short password returns 422",
			principal:  &auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true},
			body:       CreateUserRequest{Email: validEmail, Password: "short", Name: validName, Role: "team_owner"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "super_admin can create user",
			principal:  &auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true},
			body:       CreateUserRequest{Email: validEmail, Password: validPassword, Name: validName, Role: "team_owner"},
			wantStatus: http.StatusCreated,
			checkResp: func(t *testing.T, body []byte) {
				var user User
				if err := json.Unmarshal(body, &user); err != nil {
					t.Fatalf("failed to unmarshal response: %v", err)
				}
				if user.Email != validEmail {
					t.Errorf("email = %s, want %s", user.Email, validEmail)
				}
				if user.Name != validName {
					t.Errorf("name = %s, want %s", user.Name, validName)
				}
				if user.Role != "team_owner" {
					t.Errorf("role = %s, want team_owner", user.Role)
				}
				if !user.IsActive {
					t.Errorf("is_active = %v, want true", user.IsActive)
				}
			},
		},
		{
			name:       "league_admin can create team_owner in their league",
			principal:  &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, LeagueID: &leagueID, IsActive: true},
			body:       CreateUserRequest{Email: validEmail, Password: validPassword, Name: validName, Role: "team_owner", LeagueID: &leagueID},
			wantStatus: http.StatusCreated,
		},
		{
			name:       "league_admin cannot create league_admin",
			principal:  &auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, LeagueID: &leagueID, IsActive: true},
			body:       CreateUserRequest{Email: validEmail, Password: validPassword, Name: validName, Role: "league_admin", LeagueID: &leagueID},
			wantStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepository{users: make(map[uuid.UUID]User)}
			identity := &fakeIdentityProvider{users: make(map[uuid.UUID]string)}
			checker := &fakeChecker{managedLeagues: map[uuid.UUID]bool{leagueID: true}}
			svc := NewService(repo, identity, checker)
			router := newTestRouter(svc)

			body, _ := json.Marshal(tt.body)
			req := httptest.NewRequest(http.MethodPost, "/admin/users", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			if tt.principal != nil {
				req = req.WithContext(auth.WithPrincipal(req.Context(), *tt.principal))
			}
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d; body = %s", rec.Code, tt.wantStatus, rec.Body)
			}
			if tt.checkResp != nil {
				tt.checkResp(t, rec.Body.Bytes())
			}
		})
	}
}

func TestUpdateUserHandler(t *testing.T) {
	targetUserID := uuid.New()
	callerID := uuid.New()
	leagueID := uuid.New()
	newName := "Updated Name"

	tests := []struct {
		name       string
		principal  *auth.Principal
		targetID   uuid.UUID
		body       UpdateUserRequest
		setup      func(*fakeRepository, *fakeChecker)
		wantStatus int
	}{
		{
			name:       "anonymous is rejected",
			principal:  nil,
			targetID:   targetUserID,
			body:       UpdateUserRequest{Name: &newName},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:      "user not found returns 404",
			principal: &auth.Principal{UserID: callerID, Role: auth.RoleSuperAdmin, IsActive: true},
			targetID:  uuid.New(),
			body:      UpdateUserRequest{Name: &newName},
			setup: func(repo *fakeRepository, checker *fakeChecker) {
				// Don't add any users
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:      "caller cannot change own role",
			principal: &auth.Principal{UserID: targetUserID, Role: auth.RoleTeamOwner, IsActive: true},
			targetID:  targetUserID,
			body:      UpdateUserRequest{Role: strPtr("league_admin")},
			setup: func(repo *fakeRepository, checker *fakeChecker) {
				repo.users[targetUserID] = User{ID: targetUserID, Role: "team_owner", Email: "test@example.com", Name: "Test"}
			},
			wantStatus: http.StatusForbidden,
		},
		{
			name:      "super_admin can update user",
			principal: &auth.Principal{UserID: callerID, Role: auth.RoleSuperAdmin, IsActive: true},
			targetID:  targetUserID,
			body:      UpdateUserRequest{Name: &newName},
			setup: func(repo *fakeRepository, checker *fakeChecker) {
				repo.users[targetUserID] = User{ID: targetUserID, Role: "team_owner", Email: "test@example.com", Name: "Old Name"}
			},
			wantStatus: http.StatusOK,
		},
		{
			name:      "league_admin can update team_owner in their league",
			principal: &auth.Principal{UserID: callerID, Role: auth.RoleLeagueAdmin, LeagueID: &leagueID, IsActive: true},
			targetID:  targetUserID,
			body:      UpdateUserRequest{Name: &newName},
			setup: func(repo *fakeRepository, checker *fakeChecker) {
				repo.users[targetUserID] = User{ID: targetUserID, Role: "team_owner", Email: "test@example.com", Name: "Old Name", LeagueID: &leagueID}
				checker.managedLeagues[leagueID] = true
			},
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepository{users: make(map[uuid.UUID]User)}
			identity := &fakeIdentityProvider{users: make(map[uuid.UUID]string)}
			checker := &fakeChecker{managedLeagues: make(map[uuid.UUID]bool)}
			if tt.setup != nil {
				tt.setup(repo, checker)
			}
			svc := NewService(repo, identity, checker)
			router := newTestRouter(svc)

			body, _ := json.Marshal(tt.body)
			req := httptest.NewRequest(http.MethodPatch, "/admin/users/"+tt.targetID.String(), bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			if tt.principal != nil {
				req = req.WithContext(auth.WithPrincipal(req.Context(), *tt.principal))
			}
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d; body = %s", rec.Code, tt.wantStatus, rec.Body)
			}
		})
	}
}
