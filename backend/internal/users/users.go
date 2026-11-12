// Package users is the reference module: copy its layout (model, repository,
// service, handler, tests) when adding a new feature package.
package users

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Profile is the public representation of a row in public.users.
type Profile struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	Email     string     `json:"email"`
	Phone     *string    `json:"phone,omitempty"`
	Role      string     `json:"role"`
	LeagueID  *uuid.UUID `json:"league_id,omitempty"`
	TeamID    *uuid.UUID `json:"team_id,omitempty"`
	IsActive  bool       `json:"is_active"`
	CreatedAt time.Time  `json:"created_at"`
}

// Repository is the persistence contract the service depends on.
type Repository interface {
	GetByID(ctx context.Context, id uuid.UUID) (Profile, error)
}
