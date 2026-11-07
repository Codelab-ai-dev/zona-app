package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// ErrInvalidToken is returned for any token that fails verification.
var ErrInvalidToken = errors.New("invalid token")

// Claims are the registered claims this API relies on.
type Claims struct {
	Email string `json:"email,omitempty"`
	jwt.RegisteredClaims
}

// keySpec describes one accepted token source.
type keySpec struct {
	secret   []byte
	issuer   string // empty = not enforced
	audience string // empty = not enforced
}

// TokenService issues and verifies API access tokens. Only HS256 is accepted.
type TokenService struct {
	issuer string
	ttl    time.Duration
	own    keySpec
	now    func() time.Time
}

// NewTokenService builds a TokenService.
func NewTokenService(secret, issuer string, ttl time.Duration) *TokenService {
	return &TokenService{
		issuer: issuer,
		ttl:    ttl,
		own:    keySpec{secret: []byte(secret), issuer: issuer},
		now:    time.Now,
	}
}

// Issue creates a signed access token for userID.
func (s *TokenService) Issue(userID uuid.UUID, email string) (string, time.Time, error) {
	now := s.now()
	exp := now.Add(s.ttl)
	claims := Claims{
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			Issuer:    s.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
			ID:        uuid.NewString(),
		},
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.own.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign token: %w", err)
	}
	return signed, exp, nil
}

// Verify validates signature, algorithm, expiry and issuer/audience, and
// returns the subject user ID.
func (s *TokenService) Verify(raw string) (uuid.UUID, error) {
	id, err := s.verifyWith(raw, s.own)
	if err != nil {
		return uuid.Nil, ErrInvalidToken
	}
	return id, nil
}

func (s *TokenService) verifyWith(raw string, spec keySpec) (uuid.UUID, error) {
	opts := []jwt.ParserOption{
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(s.now),
		jwt.WithLeeway(30 * time.Second),
	}
	if spec.issuer != "" {
		opts = append(opts, jwt.WithIssuer(spec.issuer))
	}
	if spec.audience != "" {
		opts = append(opts, jwt.WithAudience(spec.audience))
	}

	var claims Claims
	_, err := jwt.ParseWithClaims(raw, &claims, func(*jwt.Token) (any, error) {
		return spec.secret, nil
	}, opts...)
	if err != nil {
		return uuid.Nil, err
	}
	id, err := uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.Nil, ErrInvalidToken
	}
	return id, nil
}
