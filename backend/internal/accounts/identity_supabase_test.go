package accounts

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

func TestSupabaseIdentityProviderCreateUser(t *testing.T) {
	email := "test@example.com"
	password := "validpassword123"

	tests := []struct {
		name       string
		statusCode int
		response   interface{}
		wantErr    bool
		wantID     bool
	}{
		{
			name:       "successful user creation",
			statusCode: http.StatusCreated,
			response: map[string]interface{}{
				"user": map[string]interface{}{
					"id": uuid.New().String(),
				},
			},
			wantErr: false,
			wantID:  true,
		},
		{
			name:       "duplicate email returns conflict",
			statusCode: http.StatusConflict,
			response: map[string]interface{}{
				"error": "User already exists",
			},
			wantErr: true,
			wantID:  false,
		},
		{
			name:       "bad request returns error",
			statusCode: http.StatusBadRequest,
			response: map[string]interface{}{
				"error": "Invalid email format",
			},
			wantErr: true,
			wantID:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Verify request method and path
				if r.Method != http.MethodPost {
					t.Errorf("method = %s, want POST", r.Method)
				}
				if r.URL.Path != "/auth/v1/admin/users" {
					t.Errorf("path = %s, want /auth/v1/admin/users", r.URL.Path)
				}

				// Verify headers
				if r.Header.Get("apikey") == "" {
					t.Error("missing apikey header")
				}
				if r.Header.Get("Authorization") == "" {
					t.Error("missing Authorization header")
				}
				if r.Header.Get("Content-Type") != "application/json" {
					t.Errorf("Content-Type = %s, want application/json", r.Header.Get("Content-Type"))
				}

				w.WriteHeader(tt.statusCode)
				json.NewEncoder(w).Encode(tt.response)
			}))
			defer server.Close()

			provider := NewSupabaseIdentityProvider(Config{
				SupabaseURL:    server.URL,
				ServiceRoleKey: "test-key",
			})

			id, err := provider.CreateUser(context.Background(), email, password)

			if tt.wantErr && err == nil {
				t.Fatal("expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
			if tt.wantID && id == uuid.Nil {
				t.Error("expected non-nil UUID")
			}
		})
	}
}

func TestSupabaseIdentityProviderUpdateEmail(t *testing.T) {
	userID := uuid.New()
	newEmail := "newemail@example.com"

	tests := []struct {
		name       string
		statusCode int
		response   interface{}
		wantErr    bool
	}{
		{
			name:       "successful email update",
			statusCode: http.StatusOK,
			response: map[string]interface{}{
				"user": map[string]interface{}{
					"id":    userID.String(),
					"email": newEmail,
				},
			},
			wantErr: false,
		},
		{
			name:       "duplicate email returns conflict",
			statusCode: http.StatusConflict,
			response: map[string]interface{}{
				"error": "Email already exists",
			},
			wantErr: true,
		},
		{
			name:       "bad request returns error",
			statusCode: http.StatusBadRequest,
			response: map[string]interface{}{
				"error": "Invalid email format",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Verify request method and path
				if r.Method != http.MethodPut {
					t.Errorf("method = %s, want PUT", r.Method)
				}
				expectedPath := fmt.Sprintf("/auth/v1/admin/users/%s", userID.String())
				if r.URL.Path != expectedPath {
					t.Errorf("path = %s, want %s", r.URL.Path, expectedPath)
				}

				// Verify headers
				if r.Header.Get("apikey") == "" {
					t.Error("missing apikey header")
				}
				if r.Header.Get("Authorization") == "" {
					t.Error("missing Authorization header")
				}

				w.WriteHeader(tt.statusCode)
				json.NewEncoder(w).Encode(tt.response)
			}))
			defer server.Close()

			provider := NewSupabaseIdentityProvider(Config{
				SupabaseURL:    server.URL,
				ServiceRoleKey: "test-key",
			})

			err := provider.UpdateEmail(context.Background(), userID, newEmail)

			if tt.wantErr && err == nil {
				t.Fatal("expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}

func TestSupabaseIdentityProviderDuplicateEmail(t *testing.T) {
	// Test that duplicate email errors are properly mapped to ErrConflict
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "User already registered. Use a different email address.",
		})
	}))
	defer server.Close()

	provider := NewSupabaseIdentityProvider(Config{
		SupabaseURL:    server.URL,
		ServiceRoleKey: "test-key",
	})

	_, err := provider.CreateUser(context.Background(), "duplicate@example.com", "password123")

	// Check if it's mapped to ErrConflict
	if err != httpx.ErrConflict {
		t.Errorf("error = %v, want ErrConflict", err)
	}
}

func TestSupabaseIdentityProviderDeleteUser(t *testing.T) {
	userID := uuid.New()

	tests := []struct {
		name       string
		statusCode int
		wantErr    bool
	}{
		{
			name:       "successful delete returns 204",
			statusCode: http.StatusNoContent,
			wantErr:    false,
		},
		{
			name:       "successful delete returns 200",
			statusCode: http.StatusOK,
			wantErr:    false,
		},
		{
			name:       "not found returns error",
			statusCode: http.StatusNotFound,
			wantErr:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Verify request method and path
				if r.Method != http.MethodDelete {
					t.Errorf("method = %s, want DELETE", r.Method)
				}
				expectedPath := fmt.Sprintf("/auth/v1/admin/users/%s", userID.String())
				if r.URL.Path != expectedPath {
					t.Errorf("path = %s, want %s", r.URL.Path, expectedPath)
				}

				// Verify headers
				if r.Header.Get("apikey") == "" {
					t.Error("missing apikey header")
				}
				if r.Header.Get("Authorization") == "" {
					t.Error("missing Authorization header")
				}

				w.WriteHeader(tt.statusCode)
			}))
			defer server.Close()

			provider := NewSupabaseIdentityProvider(Config{
				SupabaseURL:    server.URL,
				ServiceRoleKey: "test-key",
			})

			err := provider.DeleteUser(context.Background(), userID)

			if tt.wantErr && err == nil {
				t.Fatal("expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}
