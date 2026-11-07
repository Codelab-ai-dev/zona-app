package storage

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service handles storage operations with authorization.
type Service struct {
	store ObjectStore
	authz authz.Checker
	cfg   Config
}

// NewService builds the storage service.
func NewService(store ObjectStore, authz authz.Checker, cfg Config) *Service {
	return &Service{store: store, authz: authz, cfg: cfg}
}

// UploadResult is returned from Upload.
type UploadResult struct {
	Key      string `json:"key"`
	URL      string `json:"url,omitempty"` // Public URL if scope is public, otherwise empty
	IsPublic bool   `json:"is_public"`
	Filename string `json:"filename,omitempty"`
}

// Upload saves a file and returns the key and optionally a public URL.
// For public scopes (league, team, player), returns a direct public URL.
// For app_releases, returns an empty URL (requires presign endpoint).
func (s *Service) Upload(ctx context.Context, caller auth.Principal, scope Scope, scopeID uuid.UUID, body io.Reader, size int64, filename string) (*UploadResult, error) {
	// Validate scope and authorize
	if !ValidateScope(scope) {
		return nil, httpx.Validation(map[string]string{"scope": "invalid scope"})
	}

	if scopeID == uuid.Nil {
		return nil, httpx.Validation(map[string]string{"scope_id": "required"})
	}

	if err := s.authorizeScope(ctx, caller, scope, scopeID); err != nil {
		return nil, err
	}

	// Check size limit
	maxSize := s.cfg.MaxUploadBytesForScope(scope)
	if size > maxSize {
		return nil, httpx.ErrTooLarge
	}

	// Sniff content type (first 512 bytes)
	sniffBuf := make([]byte, 512)
	n, err := body.Read(sniffBuf)
	if err != nil && err != io.EOF {
		return nil, fmt.Errorf("read sniff: %w", err)
	}
	if n == 0 {
		return nil, httpx.Validation(map[string]string{"file": "empty file"})
	}

	contentType := http.DetectContentType(sniffBuf[:n])

	// Validate content type for scope
	allowed := AllowedContentTypes(scope)
	ext, ok := allowed[contentType]
	if !ok {
		return nil, httpx.Validation(map[string]string{"file": "unsupported content type"})
	}

	// Generate key: {scope}/{scope_id}/{uuid}{ext}
	id := uuid.New()
	key := fmt.Sprintf("%s/%s/%s%s", scope, scopeID, id, ext)

	// For upload, we need to re-compose the body: sniffBuf + rest
	composedBody := io.MultiReader(
		strings.NewReader(string(sniffBuf[:n])),
		body,
	)

	// Upload
	_, err = s.store.Put(ctx, key, composedBody, size, contentType)
	if err != nil {
		return nil, fmt.Errorf("upload: %w", err)
	}

	result := &UploadResult{
		Key:      key,
		IsPublic: IsPublicScope(scope),
		Filename: filename,
	}

	// For public scopes, return direct public URL
	if result.IsPublic && s.cfg.PublicBaseURL != "" {
		result.URL = fmt.Sprintf("%s/%s", s.cfg.PublicBaseURL, key)
	}

	return result, nil
}

// Delete removes a file. Key must match the strict pattern to prevent traversal.
func (s *Service) Delete(ctx context.Context, caller auth.Principal, key string) error {
	if key == "" {
		return httpx.Validation(map[string]string{"key": "required"})
	}

	// Parse and validate the key
	scope, scopeID, err := ParseKey(key)
	if err != nil {
		return httpx.Validation(map[string]string{"key": "invalid key format"})
	}

	// Authorize the scope
	if err := s.authorizeScope(ctx, caller, scope, scopeID); err != nil {
		return err
	}

	// Delete
	if err := s.store.Delete(ctx, key); err != nil {
		return fmt.Errorf("delete: %w", err)
	}

	return nil
}

// List returns objects in a scope, bounded by maxItems.
func (s *Service) List(ctx context.Context, caller auth.Principal, scope Scope, scopeID uuid.UUID, maxItems int) ([]Object, error) {
	if maxItems == 0 {
		maxItems = 100
	}
	if maxItems > 100 {
		maxItems = 100
	}

	if !ValidateScope(scope) {
		return nil, httpx.Validation(map[string]string{"scope": "invalid scope"})
	}

	if scopeID == uuid.Nil {
		return nil, httpx.Validation(map[string]string{"scope_id": "required"})
	}

	// Authorize the scope
	if err := s.authorizeScope(ctx, caller, scope, scopeID); err != nil {
		return nil, err
	}

	// List objects under the prefix: {scope}/{scope_id}/
	prefix := fmt.Sprintf("%s/%s/", scope, scopeID)
	objects, err := s.store.List(ctx, prefix)
	if err != nil {
		return nil, fmt.Errorf("list: %w", err)
	}

	// Bound the results
	if len(objects) > maxItems {
		objects = objects[:maxItems]
	}

	return objects, nil
}

// URL returns a public URL for a key (for public scopes) or presigned URL (for others).
func (s *Service) URL(ctx context.Context, caller auth.Principal, key string) (string, error) {
	if key == "" {
		return "", httpx.Validation(map[string]string{"key": "required"})
	}

	// Parse the key to extract scope and scope_id
	scope, scopeID, err := ParseKey(key)
	if err != nil {
		return "", httpx.Validation(map[string]string{"key": "invalid key format"})
	}

	// For public scopes, return direct public URL
	if IsPublicScope(scope) && s.cfg.PublicBaseURL != "" {
		return fmt.Sprintf("%s/%s", s.cfg.PublicBaseURL, key), nil
	}

	// For non-public scopes (app_releases), require authorization and presign
	if err := s.authorizeScope(ctx, caller, scope, scopeID); err != nil {
		return "", err
	}

	// Generate presigned URL
	url, err := s.store.PresignGet(ctx, key, s.cfg.PresignTTL)
	if err != nil {
		return "", fmt.Errorf("presign: %w", err)
	}

	return url, nil
}

// authorizeScope checks if the caller can manage the given scope.
func (s *Service) authorizeScope(ctx context.Context, caller auth.Principal, scope Scope, scopeID uuid.UUID) error {
	// Super admins can manage everything
	if caller.IsSuperAdmin() {
		return nil
	}

	switch scope {
	case ScopeLeague:
		return s.authz.CanManageLeague(ctx, caller, scopeID)
	case ScopeTeam:
		return s.authz.CanManageTeam(ctx, caller, scopeID)
	case ScopePlayer:
		return s.authz.CanManagePlayer(ctx, caller, scopeID)
	case ScopeAppReleases:
		// Only super admins can manage app releases
		return httpx.ErrForbidden
	default:
		return httpx.Validation(map[string]string{"scope": "invalid scope"})
	}
}
