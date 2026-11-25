package oauth

import (
	"bytes"
	"context"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
)

// fakeRepo is an in-memory Repository with the same semantics as the SQL.
type fakeRepo struct {
	mu      sync.Mutex
	clients map[uuid.UUID]Client
	authzs  map[uuid.UUID]*fakeAuthz
	grants  map[uuid.UUID]*fakeGrant
	tokens  map[uuid.UUID]*fakeToken
}

type fakeAuthz struct {
	Authorization
	codeHash []byte
	codeUsed bool
}

type fakeGrant struct {
	Grant
	revoked bool
}

type fakeToken struct {
	id, grantID uuid.UUID
	kind        string
	hash        []byte
	expiresAt   time.Time
	revoked     bool
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		clients: map[uuid.UUID]Client{},
		authzs:  map[uuid.UUID]*fakeAuthz{},
		grants:  map[uuid.UUID]*fakeGrant{},
		tokens:  map[uuid.UUID]*fakeToken{},
	}
}

func (r *fakeRepo) CreateClient(_ context.Context, c Client) (Client, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	c.ID, c.CreatedAt = uuid.New(), time.Now()
	r.clients[c.ID] = c
	return c, nil
}

func (r *fakeRepo) ClientByID(_ context.Context, id uuid.UUID) (Client, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.clients[id]
	if !ok {
		return Client{}, ErrNotFound
	}
	return c, nil
}

func (r *fakeRepo) CreateAuthorization(_ context.Context, a Authorization) (uuid.UUID, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	a.ID = uuid.New()
	r.authzs[a.ID] = &fakeAuthz{Authorization: a}
	return a.ID, nil
}

func (r *fakeRepo) authz(a *fakeAuthz) Authorization {
	out := a.Authorization
	if a.GrantID != nil {
		out.UserID = r.grants[*a.GrantID].UserID
	}
	return out
}

func (r *fakeRepo) AuthorizationByID(_ context.Context, id uuid.UUID) (Authorization, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	a, ok := r.authzs[id]
	if !ok {
		return Authorization{}, ErrNotFound
	}
	return r.authz(a), nil
}

func (r *fakeRepo) ApproveAuthorization(_ context.Context, id, userID uuid.UUID, codeHash []byte, codeExpiresAt time.Time) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	a, ok := r.authzs[id]
	if !ok || a.DecidedAt != nil {
		return false, nil
	}
	var grant *fakeGrant
	for _, g := range r.grants {
		if g.UserID == userID && g.ClientID == a.ClientID && !g.revoked {
			grant = g
		}
	}
	if grant == nil {
		grant = &fakeGrant{Grant: Grant{ID: uuid.New(), UserID: userID, ClientID: a.ClientID, CreatedAt: time.Now()}}
		r.grants[grant.ID] = grant
	}
	grant.Scope, grant.Resource = a.Scope, a.Resource
	now := time.Now()
	a.DecidedAt, a.GrantID, a.codeHash, a.CodeExpiresAt = &now, &grant.ID, codeHash, &codeExpiresAt
	return true, nil
}

func (r *fakeRepo) DenyAuthorization(_ context.Context, id uuid.UUID) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	a, ok := r.authzs[id]
	if !ok || a.DecidedAt != nil {
		return false, nil
	}
	now := time.Now()
	a.DecidedAt = &now
	return true, nil
}

func (r *fakeRepo) ConsumeCode(_ context.Context, codeHash []byte) (Authorization, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, a := range r.authzs {
		if a.codeHash != nil && bytes.Equal(a.codeHash, codeHash) {
			if a.codeUsed {
				return r.authz(a), ErrCodeUsed
			}
			a.codeUsed = true
			return r.authz(a), nil
		}
	}
	return Authorization{}, ErrNotFound
}

func (r *fakeRepo) CreateToken(_ context.Context, grantID uuid.UUID, kind string, hash []byte, expiresAt time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	t := &fakeToken{id: uuid.New(), grantID: grantID, kind: kind, hash: hash, expiresAt: expiresAt}
	r.tokens[t.id] = t
	return nil
}

func (r *fakeRepo) TokenByHash(_ context.Context, hash []byte) (Token, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, t := range r.tokens {
		if bytes.Equal(t.hash, hash) {
			g := r.grants[t.grantID]
			out := Token{ID: t.id, GrantID: t.grantID, Kind: t.kind, ExpiresAt: t.expiresAt,
				UserID: g.UserID, ClientID: g.ClientID, Scope: g.Scope, Resource: g.Resource}
			now := time.Now()
			if t.revoked {
				out.RevokedAt = &now
			}
			if g.revoked {
				out.GrantRevokedAt = &now
			}
			return out, nil
		}
	}
	return Token{}, ErrNotFound
}

func (r *fakeRepo) RevokeToken(_ context.Context, id uuid.UUID) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	t, ok := r.tokens[id]
	if !ok || t.revoked {
		return false, nil
	}
	t.revoked = true
	return true, nil
}

func (r *fakeRepo) RevokeGrant(_ context.Context, grantID uuid.UUID) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.revokeGrantLocked(grantID)
	return nil
}

func (r *fakeRepo) revokeGrantLocked(grantID uuid.UUID) {
	if g, ok := r.grants[grantID]; ok {
		g.revoked = true
	}
	for _, t := range r.tokens {
		if t.grantID == grantID {
			t.revoked = true
		}
	}
}

func (r *fakeRepo) TouchGrant(_ context.Context, grantID uuid.UUID) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	now := time.Now()
	r.grants[grantID].LastUsedAt = &now
	return nil
}

func (r *fakeRepo) ListGrants(_ context.Context, userID uuid.UUID, limit, offset int) ([]Grant, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	var out []Grant
	for _, g := range r.grants {
		if g.UserID == userID && !g.revoked {
			gg := g.Grant
			gg.ClientName = r.clients[g.ClientID].Name
			out = append(out, gg)
		}
	}
	return out, nil
}

func (r *fakeRepo) RevokeUserGrant(_ context.Context, userID, grantID uuid.UUID) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	g, ok := r.grants[grantID]
	if !ok || g.UserID != userID || g.revoked {
		return false, nil
	}
	r.revokeGrantLocked(grantID)
	return true, nil
}

// fakeProfiles returns principals by user ID.
type fakeProfiles struct {
	mu    sync.Mutex
	users map[uuid.UUID]auth.Principal
}

func (f *fakeProfiles) LoadPrincipal(_ context.Context, id uuid.UUID) (auth.Principal, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	p, ok := f.users[id]
	if !ok {
		return auth.Principal{}, auth.ErrProfileNotFound
	}
	return p, nil
}

func (f *fakeProfiles) set(p auth.Principal) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.users[p.UserID] = p
}
