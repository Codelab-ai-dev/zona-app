package users

import (
	"context"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
)

// Service holds business rules. Authorization decisions live here, not in
// handlers, so they are unit-testable without HTTP.
type Service struct {
	repo Repository
}

// NewService builds the users service.
func NewService(repo Repository) *Service { return &Service{repo: repo} }

// Me returns the caller's own profile.
func (s *Service) Me(ctx context.Context, caller auth.Principal) (Profile, error) {
	return s.repo.GetByID(ctx, caller.UserID)
}
