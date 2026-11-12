//go:build integration

package accounts

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestPGRepository_AgainstSchema(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Simulate GoTrue: inserting into auth.users fires handle_new_user, which
	// creates a 'public' profile. CreateUser must upsert over it.
	id := uuid.New()
	email := id.String() + "@test.local"
	if _, err := pool.Exec(ctx, `INSERT INTO auth.users (id, email) VALUES ($1, $2)`, id, email); err != nil {
		t.Fatal(err)
	}
	if err := repo.CreateUser(ctx, User{ID: id, Name: "Dueño", Email: email, Role: "team_owner", LeagueID: &f.LeagueID, IsActive: true}); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	got, err := repo.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.Role != "team_owner" || got.LeagueID == nil || *got.LeagueID != f.LeagueID {
		t.Fatalf("profile not upserted: %+v", got)
	}

	name, role, active := "Nuevo", "public", false
	updated, err := repo.UpdateUser(ctx, id, UpdateUserRequest{Name: &name, Role: &role, IsActive: &active})
	if err != nil {
		t.Fatalf("UpdateUser: %v", err)
	}
	if updated.Name != name || updated.Role != role || updated.IsActive {
		t.Fatalf("update not applied: %+v", updated)
	}
}

func TestPGRepository_CreateUserOwnsTeam(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	if l, err := repo.TeamLeague(ctx, f.HomeTeamID); err != nil || l != f.LeagueID {
		t.Fatalf("TeamLeague = %s %v", l, err)
	}
	id := uuid.New()
	email := id.String() + "@test.local"
	if _, err := pool.Exec(ctx, `INSERT INTO auth.users (id, email) VALUES ($1, $2)`, id, email); err != nil {
		t.Fatal(err)
	}
	if err := repo.CreateUser(ctx, User{ID: id, Name: "Dueño", Email: email, Role: "team_owner", LeagueID: &f.LeagueID, TeamID: &f.HomeTeamID, IsActive: true}); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	var owner uuid.UUID
	_ = pool.QueryRow(ctx, `SELECT owner_id FROM public.teams WHERE id = $1`, f.HomeTeamID).Scan(&owner)
	if owner != id {
		t.Fatalf("owner = %s, want %s", owner, id)
	}
	// A team of another league is never reassigned.
	if err := repo.CreateUser(ctx, User{ID: id, Name: "Dueño", Email: email, Role: "team_owner", LeagueID: &f.LeagueID, TeamID: &other.HomeTeamID, IsActive: true}); err != nil {
		t.Fatal(err)
	}
	_ = pool.QueryRow(ctx, `SELECT owner_id FROM public.teams WHERE id = $1`, other.HomeTeamID).Scan(&owner)
	if owner != other.TeamOwnerID {
		t.Fatalf("other league team reassigned to %s", owner)
	}
}
