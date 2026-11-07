// Package accounts manages user creation and updates with authorization and
// identity provider (auth.users).
package accounts

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// CreateUserRequest is the body for POST /admin/users.
type CreateUserRequest struct {
	Email    string     `json:"email"`
	Password string     `json:"password"`
	Name     string     `json:"name"`
	Phone    *string    `json:"phone,omitempty"`
	Role     string     `json:"role"`
	LeagueID *uuid.UUID `json:"league_id,omitempty"`
}

// Validate checks the request fields and returns a map of field -> message
// for invalid fields (empty map when valid).
func (r CreateUserRequest) Validate() map[string]string {
	errs := make(map[string]string)

	if r.Email == "" {
		errs["email"] = "El email es requerido"
	} else if !isValidEmail(r.Email) {
		errs["email"] = "El formato del email no es válido"
	}

	if r.Password == "" {
		errs["password"] = "La contraseña es requerida"
	} else if len(r.Password) < 10 {
		errs["password"] = "La contraseña debe tener al menos 10 caracteres"
	} else if len(r.Password) > 72 {
		// bcrypt only uses the first 72 bytes; reject instead of truncating.
		errs["password"] = "La contraseña debe tener como máximo 72 caracteres"
	}

	if r.Name == "" {
		errs["name"] = "El nombre es requerido"
	} else if len(r.Name) < 2 || len(r.Name) > 100 {
		errs["name"] = "El nombre debe tener entre 2 y 100 caracteres"
	}

	if r.Role == "" {
		errs["role"] = "El rol es requerido"
	} else if !isValidRole(r.Role) {
		errs["role"] = "El rol no es válido"
	}

	return errs
}

// UpdateUserRequest is the body for PATCH /admin/users/{userID}.
type UpdateUserRequest struct {
	Email    *string `json:"email,omitempty"`
	Name     *string `json:"name,omitempty"`
	Phone    *string `json:"phone,omitempty"`
	Role     *string `json:"role,omitempty"`
	IsActive *bool   `json:"is_active,omitempty"`
}

// Validate checks the request fields.
func (r UpdateUserRequest) Validate() map[string]string {
	errs := make(map[string]string)

	if r.Email != nil {
		if *r.Email == "" {
			errs["email"] = "El email no puede estar vacío"
		} else if !isValidEmail(*r.Email) {
			errs["email"] = "El formato del email no es válido"
		}
	}

	if r.Name != nil {
		if *r.Name == "" {
			errs["name"] = "El nombre no puede estar vacío"
		} else if len(*r.Name) < 2 || len(*r.Name) > 100 {
			errs["name"] = "El nombre debe tener entre 2 y 100 caracteres"
		}
	}

	if r.Role != nil {
		if *r.Role == "" {
			errs["role"] = "El rol no puede estar vacío"
		} else if !isValidRole(*r.Role) {
			errs["role"] = "El rol no es válido"
		}
	}

	return errs
}

// User is the profile response DTO (mirrors public.users).
type User struct {
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

// Repository is the persistence contract for user operations.
type Repository interface {
	CreateUser(ctx context.Context, user User) error
	UpdateUser(ctx context.Context, userID uuid.UUID, updates UpdateUserRequest) (User, error)
	GetByID(ctx context.Context, userID uuid.UUID) (User, error)
}

// IdentityProvider manages login identities (auth.users).
type IdentityProvider interface {
	CreateUser(ctx context.Context, email, password string) (uuid.UUID, error)
	UpdateEmail(ctx context.Context, userID uuid.UUID, email string) error
	DeleteUser(ctx context.Context, userID uuid.UUID) error
}

// Helper functions
func isValidEmail(email string) bool {
	// Simple email validation using the standard library approach
	if len(email) < 3 || len(email) > 254 {
		return false
	}
	// Check if there's exactly one @ and it's not at the start/end
	at := 0
	for i, c := range email {
		if c == '@' {
			if i == 0 || i == len(email)-1 {
				return false
			}
			at++
		}
	}
	return at == 1
}

func isValidRole(role string) bool {
	switch role {
	case "super_admin", "league_admin", "team_owner", "public":
		return true
	default:
		return false
	}
}
