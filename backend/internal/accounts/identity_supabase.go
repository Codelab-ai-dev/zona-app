package accounts

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// SupabaseIdentityProvider implements IdentityProvider using GoTrue admin API.
type SupabaseIdentityProvider struct {
	baseURL        string
	serviceRoleKey string
	httpClient     *http.Client
}

// NewSupabaseIdentityProvider builds a Supabase identity provider.
func NewSupabaseIdentityProvider(cfg Config) *SupabaseIdentityProvider {
	return &SupabaseIdentityProvider{
		baseURL:        cfg.SupabaseURL,
		serviceRoleKey: cfg.ServiceRoleKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// CreateUser creates a new user in Supabase Auth and returns their UUID.
func (p *SupabaseIdentityProvider) CreateUser(ctx context.Context, email, password string) (uuid.UUID, error) {
	reqBody := struct {
		Email        string `json:"email"`
		Password     string `json:"password"`
		EmailConfirm bool   `json:"email_confirm"`
	}{
		Email:        email,
		Password:     password,
		EmailConfirm: true, // Auto-confirm to skip verification flow
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return uuid.Nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("%s/auth/v1/admin/users", p.baseURL),
		bytes.NewReader(body))
	if err != nil {
		return uuid.Nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", p.serviceRoleKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", p.serviceRoleKey))

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return uuid.Nil, fmt.Errorf("identity provider: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated {
		// Map common Supabase errors to httpx errors
		if resp.StatusCode == http.StatusConflict || resp.StatusCode == http.StatusBadRequest {
			// Check if it's a duplicate email error
			if bytes.Contains(respBody, []byte("email")) || bytes.Contains(respBody, []byte("already")) {
				return uuid.Nil, httpx.ErrConflict
			}
		}
		return uuid.Nil, httpx.ErrInternal.Wrap(fmt.Errorf("identity provider returned %d: %s", resp.StatusCode, respBody))
	}

	var result struct {
		User struct {
			ID uuid.UUID `json:"id"`
		} `json:"user"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return uuid.Nil, fmt.Errorf("parse identity provider response: %w", err)
	}

	return result.User.ID, nil
}

// UpdateEmail updates a user's email in Supabase Auth.
func (p *SupabaseIdentityProvider) UpdateEmail(ctx context.Context, userID uuid.UUID, email string) error {
	reqBody := struct {
		Email        string `json:"email"`
		EmailConfirm bool   `json:"email_confirm"`
	}{
		Email:        email,
		EmailConfirm: true,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut,
		fmt.Sprintf("%s/auth/v1/admin/users/%s", p.baseURL, userID.String()),
		bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", p.serviceRoleKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", p.serviceRoleKey))

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("identity provider: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		// Check for conflict (duplicate email)
		if resp.StatusCode == http.StatusConflict || resp.StatusCode == http.StatusBadRequest {
			if bytes.Contains(respBody, []byte("email")) || bytes.Contains(respBody, []byte("already")) {
				return httpx.ErrConflict
			}
		}
		return httpx.ErrInternal.Wrap(fmt.Errorf("identity provider returned %d: %s", resp.StatusCode, respBody))
	}

	return nil
}

// DeleteUser deletes a user from Supabase Auth (best-effort cleanup).
func (p *SupabaseIdentityProvider) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete,
		fmt.Sprintf("%s/auth/v1/admin/users/%s", p.baseURL, userID.String()),
		nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("apikey", p.serviceRoleKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", p.serviceRoleKey))

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("identity provider: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return httpx.ErrInternal.Wrap(fmt.Errorf("identity provider returned %d: %s", resp.StatusCode, respBody))
	}

	return nil
}
