package accounts

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Fakes for testing
type fakeRepository struct {
	users map[uuid.UUID]User
	calls []string
}

func (f *fakeRepository) CreateUser(_ context.Context, user User) error {
	f.calls = append(f.calls, "CreateUser")
	if _, exists := f.users[user.ID]; exists {
		return httpx.ErrConflict
	}
	f.users[user.ID] = user
	return nil
}

func (f *fakeRepository) UpdateUser(_ context.Context, userID uuid.UUID, updates UpdateUserRequest) (User, error) {
	f.calls = append(f.calls, "UpdateUser")
	user, ok := f.users[userID]
	if !ok {
		return User{}, httpx.ErrNotFound
	}
	if updates.Email != nil && *updates.Email != "" {
		user.Email = *updates.Email
	}
	if updates.Name != nil && *updates.Name != "" {
		user.Name = *updates.Name
	}
	if updates.Phone != nil {
		user.Phone = updates.Phone
	}
	if updates.Role != nil && *updates.Role != "" {
		user.Role = *updates.Role
	}
	if updates.IsActive != nil {
		user.IsActive = *updates.IsActive
	}
	f.users[userID] = user
	return user, nil
}

func (f *fakeRepository) GetByID(_ context.Context, userID uuid.UUID) (User, error) {
	f.calls = append(f.calls, "GetByID")
	user, ok := f.users[userID]
	if !ok {
		return User{}, httpx.ErrNotFound
	}
	return user, nil
}

type fakeIdentityProvider struct {
	users map[uuid.UUID]string // userID -> email
	calls []string
}

func (f *fakeIdentityProvider) CreateUser(_ context.Context, email, password string) (uuid.UUID, error) {
	f.calls = append(f.calls, "CreateUser")
	for _, e := range f.users {
		if e == email {
			return uuid.Nil, httpx.ErrConflict
		}
	}
	id := uuid.New()
	f.users[id] = email
	return id, nil
}

func (f *fakeIdentityProvider) UpdateEmail(_ context.Context, userID uuid.UUID, email string) error {
	f.calls = append(f.calls, "UpdateEmail")
	// Check if email already exists in identity provider
	for uid, e := range f.users {
		if e == email && uid != userID {
			return httpx.ErrConflict
		}
	}
	f.users[userID] = email
	return nil
}

func (f *fakeIdentityProvider) DeleteUser(_ context.Context, userID uuid.UUID) error {
	f.calls = append(f.calls, "DeleteUser")
	delete(f.users, userID)
	return nil
}

type fakeChecker struct {
	managedLeagues map[uuid.UUID]bool // leagueID -> isManaged
	calls          []string
}

func (f *fakeChecker) CanManageLeague(_ context.Context, p auth.Principal, leagueID uuid.UUID) error {
	f.calls = append(f.calls, "CanManageLeague")
	if p.IsSuperAdmin() {
		return nil
	}
	if f.managedLeagues[leagueID] {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeChecker) CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error {
	return nil
}

func (f *fakeChecker) CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error {
	return nil
}

func (f *fakeChecker) CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error {
	return nil
}

func (f *fakeChecker) CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error {
	return nil
}

// Tests for CreateUser
func TestCreateUser(t *testing.T) {
	validEmail := "test@example.com"
	validName := "Test User"
	validPassword := "validpassword123"
	leagueID := uuid.New()

	tests := []struct {
		name    string
		caller  auth.Principal
		req     CreateUserRequest
		wantErr bool
	}{
		{
			name:    "team_owner cannot create users",
			caller:  auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner, IsActive: true},
			req:     CreateUserRequest{Email: validEmail, Password: validPassword, Name: validName, Role: "team_owner"},
			wantErr: true,
		},
		{
			name:    "league_admin cannot create super_admin",
			caller:  auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, LeagueID: &leagueID, IsActive: true},
			req:     CreateUserRequest{Email: validEmail, Password: validPassword, Name: validName, Role: "super_admin", LeagueID: &leagueID},
			wantErr: true,
		},
		{
			name:    "league_admin cannot create league_admin",
			caller:  auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, LeagueID: &leagueID, IsActive: true},
			req:     CreateUserRequest{Email: validEmail, Password: validPassword, Name: validName, Role: "league_admin", LeagueID: &leagueID},
			wantErr: true,
		},
		{
			name:    "super_admin can create team_owner",
			caller:  auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true},
			req:     CreateUserRequest{Email: validEmail, Password: validPassword, Name: validName, Role: "team_owner"},
			wantErr: false,
		},
		{
			name:    "super_admin can create league_admin",
			caller:  auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true},
			req:     CreateUserRequest{Email: validEmail, Password: validPassword, Name: validName, Role: "league_admin"},
			wantErr: false,
		},
		{
			name:    "league_admin can create team_owner in their league",
			caller:  auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, LeagueID: &leagueID, IsActive: true},
			req:     CreateUserRequest{Email: validEmail, Password: validPassword, Name: validName, Role: "team_owner", LeagueID: &leagueID},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepository{users: make(map[uuid.UUID]User)}
			identity := &fakeIdentityProvider{users: make(map[uuid.UUID]string)}
			checker := &fakeChecker{managedLeagues: map[uuid.UUID]bool{leagueID: true}}
			svc := NewService(repo, identity, checker)

			_, err := svc.CreateUser(context.Background(), tt.caller, tt.req)

			if tt.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}

// Tests for UpdateUser
func TestUpdateUser(t *testing.T) {
	targetUserID := uuid.New()
	callerID := uuid.New()
	leagueID := uuid.New()
	newName := "New Name"

	tests := []struct {
		name     string
		caller   auth.Principal
		targetID uuid.UUID
		req      UpdateUserRequest
		setup    func(*fakeRepository, *fakeChecker)
		wantErr  bool
	}{
		{
			name:     "caller cannot change their own role",
			caller:   auth.Principal{UserID: targetUserID, Role: auth.RoleTeamOwner, IsActive: true},
			targetID: targetUserID,
			req:      UpdateUserRequest{Role: strPtr("league_admin")},
			setup: func(repo *fakeRepository, checker *fakeChecker) {
				repo.users[targetUserID] = User{ID: targetUserID, Role: "team_owner", Email: "test@example.com", Name: "Test"}
			},
			wantErr: true,
		},
		{
			name:     "super_admin can update any user",
			caller:   auth.Principal{UserID: callerID, Role: auth.RoleSuperAdmin, IsActive: true},
			targetID: targetUserID,
			req:      UpdateUserRequest{Name: &newName},
			setup: func(repo *fakeRepository, checker *fakeChecker) {
				repo.users[targetUserID] = User{ID: targetUserID, Role: "team_owner", Email: "test@example.com", Name: "Old Name"}
			},
			wantErr: false,
		},
		{
			name:     "league_admin cannot update non-team_owner users",
			caller:   auth.Principal{UserID: callerID, Role: auth.RoleLeagueAdmin, LeagueID: &leagueID, IsActive: true},
			targetID: targetUserID,
			req:      UpdateUserRequest{Name: &newName},
			setup: func(repo *fakeRepository, checker *fakeChecker) {
				anotherLeagueID := uuid.New()
				repo.users[targetUserID] = User{ID: targetUserID, Role: "league_admin", Email: "test@example.com", Name: "Test", LeagueID: &anotherLeagueID}
				checker.managedLeagues[leagueID] = true
			},
			wantErr: true,
		},
		{
			name:     "league_admin cannot assign super_admin role",
			caller:   auth.Principal{UserID: callerID, Role: auth.RoleLeagueAdmin, LeagueID: &leagueID, IsActive: true},
			targetID: targetUserID,
			req:      UpdateUserRequest{Role: strPtr("super_admin")},
			setup: func(repo *fakeRepository, checker *fakeChecker) {
				repo.users[targetUserID] = User{ID: targetUserID, Role: "team_owner", Email: "test@example.com", Name: "Test", LeagueID: &leagueID}
				checker.managedLeagues[leagueID] = true
			},
			wantErr: true,
		},
		{
			name:     "league_admin can update team_owner in their league",
			caller:   auth.Principal{UserID: callerID, Role: auth.RoleLeagueAdmin, LeagueID: &leagueID, IsActive: true},
			targetID: targetUserID,
			req:      UpdateUserRequest{Name: &newName},
			setup: func(repo *fakeRepository, checker *fakeChecker) {
				repo.users[targetUserID] = User{ID: targetUserID, Role: "team_owner", Email: "test@example.com", Name: "Old Name", LeagueID: &leagueID}
				checker.managedLeagues[leagueID] = true
			},
			wantErr: false,
		},
		{
			name:     "league_admin cannot update team_owner without league",
			caller:   auth.Principal{UserID: callerID, Role: auth.RoleLeagueAdmin, LeagueID: &leagueID, IsActive: true},
			targetID: targetUserID,
			req:      UpdateUserRequest{Name: &newName},
			setup: func(repo *fakeRepository, checker *fakeChecker) {
				repo.users[targetUserID] = User{ID: targetUserID, Role: "team_owner", Email: "test@example.com", Name: "Old Name", LeagueID: nil}
				checker.managedLeagues[leagueID] = true
			},
			wantErr: true,
		},
		{
			name:     "league_admin cannot change own role",
			caller:   auth.Principal{UserID: callerID, Role: auth.RoleLeagueAdmin, LeagueID: &leagueID, IsActive: true},
			targetID: callerID,
			req:      UpdateUserRequest{Role: strPtr("super_admin")},
			setup: func(repo *fakeRepository, checker *fakeChecker) {
				repo.users[callerID] = User{ID: callerID, Role: "league_admin", Email: "admin@example.com", Name: "Admin", LeagueID: &leagueID}
				checker.managedLeagues[leagueID] = true
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepository{users: make(map[uuid.UUID]User)}
			identity := &fakeIdentityProvider{users: make(map[uuid.UUID]string)}
			checker := &fakeChecker{managedLeagues: make(map[uuid.UUID]bool)}
			tt.setup(repo, checker)
			svc := NewService(repo, identity, checker)

			_, err := svc.UpdateUser(context.Background(), tt.caller, tt.targetID, tt.req)

			if tt.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}

// TestCreateUserIDMatches verifies that the profile ID matches the identity ID.
func TestCreateUserIDMatches(t *testing.T) {
	repo := &fakeRepository{users: make(map[uuid.UUID]User)}
	identity := &fakeIdentityProvider{users: make(map[uuid.UUID]string)}
	checker := &fakeChecker{managedLeagues: map[uuid.UUID]bool{}}
	svc := NewService(repo, identity, checker)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true}
	req := CreateUserRequest{
		Email:    "test@example.com",
		Password: "validpassword123",
		Name:     "Test User",
		Role:     "team_owner",
	}

	user, err := svc.CreateUser(context.Background(), caller, req)
	if err != nil {
		t.Fatalf("CreateUser failed: %v", err)
	}

	// Profile ID should match identity ID
	if user.ID == uuid.Nil {
		t.Fatal("user.ID is nil")
	}

	// Verify that the identity has this ID
	_, ok := identity.users[user.ID]
	if !ok {
		t.Errorf("identity does not have user ID %s", user.ID)
	}

	// Verify that the repo has this ID
	repoUser, ok := repo.users[user.ID]
	if !ok {
		t.Errorf("repo does not have user ID %s", user.ID)
	}
	if repoUser.ID != user.ID {
		t.Errorf("repo user ID %s does not match profile ID %s", repoUser.ID, user.ID)
	}
}

// Helper functions for pointer values
func strPtr(s string) *string {
	return &s
}

func boolPtr(b bool) *bool {
	return &b
}
