// Package auth verifies access tokens, resolves the caller's profile and
// provides authorization helpers for handlers.
package auth

import (
	"context"

	"github.com/google/uuid"
)

// Role mirrors the public.user_role enum.
type Role string

const (
	RoleSuperAdmin  Role = "super_admin"
	RoleLeagueAdmin Role = "league_admin"
	RoleTeamOwner   Role = "team_owner"
	RolePublic      Role = "public"
)

// Principal is the authenticated caller, loaded from public.users.
// LeagueID and TeamID are the scopes stored on the profile (may be nil).
type Principal struct {
	UserID   uuid.UUID
	Email    string
	Role     Role
	LeagueID *uuid.UUID
	TeamID   *uuid.UUID
	IsActive bool
}

// HasRole reports whether the principal has any of the given roles.
func (p Principal) HasRole(roles ...Role) bool {
	for _, r := range roles {
		if p.Role == r {
			return true
		}
	}
	return false
}

// IsSuperAdmin is a shorthand used by most authorization checks.
func (p Principal) IsSuperAdmin() bool { return p.Role == RoleSuperAdmin }

type ctxKey struct{}

// WithPrincipal stores the principal in ctx.
func WithPrincipal(ctx context.Context, p Principal) context.Context {
	return context.WithValue(ctx, ctxKey{}, p)
}

// FromContext returns the principal set by the Authenticate middleware.
func FromContext(ctx context.Context) (Principal, bool) {
	p, ok := ctx.Value(ctxKey{}).(Principal)
	return p, ok
}
