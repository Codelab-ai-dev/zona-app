package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	ownSecret   = "own-secret-own-secret-own-secret-000"
	otherSecret = "other-secret-other-secret-other-0000"
)

func signHS(t *testing.T, method jwt.SigningMethod, secret string, claims jwt.MapClaims) string {
	t.Helper()
	s, err := jwt.NewWithClaims(method, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestTokenService_IssueAndVerify(t *testing.T) {
	ts := NewTokenService(ownSecret, "zona-api", time.Minute)
	id := uuid.New()

	raw, _, err := ts.Issue(id, "a@b.com")
	if err != nil {
		t.Fatal(err)
	}
	got, err := ts.Verify(raw)
	if err != nil {
		t.Fatalf("Verify: %v", err)
	}
	if got != id {
		t.Errorf("subject = %s, want %s", got, id)
	}
}

func TestTokenService_Rejects(t *testing.T) {
	id := uuid.New().String()
	future := time.Now().Add(time.Hour).Unix()
	past := time.Now().Add(-time.Hour).Unix()

	tests := []struct {
		name  string
		ts    *TokenService
		token string
	}{
		{
			name:  "wrong secret",
			ts:    NewTokenService(ownSecret, "zona-api", time.Minute),
			token: signHS(t, jwt.SigningMethodHS256, "another-secret-another-secret-0000", jwt.MapClaims{"sub": id, "iss": "zona-api", "exp": future}),
		},
		{
			name:  "expired",
			ts:    NewTokenService(ownSecret, "zona-api", time.Minute),
			token: signHS(t, jwt.SigningMethodHS256, ownSecret, jwt.MapClaims{"sub": id, "iss": "zona-api", "exp": past}),
		},
		{
			name:  "missing exp",
			ts:    NewTokenService(ownSecret, "zona-api", time.Minute),
			token: signHS(t, jwt.SigningMethodHS256, ownSecret, jwt.MapClaims{"sub": id, "iss": "zona-api"}),
		},
		{
			name:  "wrong issuer",
			ts:    NewTokenService(ownSecret, "zona-api", time.Minute),
			token: signHS(t, jwt.SigningMethodHS256, ownSecret, jwt.MapClaims{"sub": id, "iss": "evil", "exp": future}),
		},
		{
			name: "algorithm none",
			ts:   NewTokenService(ownSecret, "zona-api", time.Minute),
			token: func() string {
				s, _ := jwt.NewWithClaims(jwt.SigningMethodNone, jwt.MapClaims{"sub": id, "iss": "zona-api", "exp": future}).SignedString(jwt.UnsafeAllowNoneSignatureType)
				return s
			}(),
		},
		{
			name:  "HS512 not allowed",
			ts:    NewTokenService(ownSecret, "zona-api", time.Minute),
			token: signHS(t, jwt.SigningMethodHS512, ownSecret, jwt.MapClaims{"sub": id, "iss": "zona-api", "exp": future}),
		},
		{
			name:  "non-uuid subject",
			ts:    NewTokenService(ownSecret, "zona-api", time.Minute),
			token: signHS(t, jwt.SigningMethodHS256, ownSecret, jwt.MapClaims{"sub": "admin", "iss": "zona-api", "exp": future}),
		},
		{
			name:  "token signed with another secret",
			ts:    NewTokenService(ownSecret, "zona-api", time.Minute),
			token: signHS(t, jwt.SigningMethodHS256, otherSecret, jwt.MapClaims{"sub": id, "iss": "zona-api", "exp": future}),
		},
		{
			name:  "garbage",
			ts:    NewTokenService(ownSecret, "zona-api", time.Minute),
			token: "abc.def.ghi",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := tt.ts.Verify(tt.token); err == nil {
				t.Fatal("expected token to be rejected")
			}
		})
	}
}
