package session

// RawRefresh exposes the refresh token to tests outside the package.
func (t Tokens) RawRefresh() string { return t.refresh }
