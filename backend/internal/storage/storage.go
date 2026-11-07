// Package storage handles file uploads and management using S3-compatible storage.
package storage

import (
	"context"
	"io"
	"regexp"
	"time"

	"github.com/google/uuid"
)

// Scope defines what type of object is being stored.
type Scope string

const (
	ScopeLeague      Scope = "league"
	ScopeTeam        Scope = "team"
	ScopePlayer      Scope = "player"
	ScopeAppReleases Scope = "app_releases"
	// ScopePlayerDocument holds identity documents for manual verification.
	// It is PRIVATE: never served through PublicBaseURL, only via short-lived
	// presigned URLs to callers who manage the player. The bucket policy must
	// allow public reads only on the league/, team/ and player/ prefixes.
	ScopePlayerDocument Scope = "player_document"
)

// ValidateScope reports whether a scope is allowed.
func ValidateScope(s Scope) bool {
	switch s {
	case ScopeLeague, ScopeTeam, ScopePlayer, ScopeAppReleases, ScopePlayerDocument:
		return true
	}
	return false
}

// Object represents a stored file.
type Object struct {
	Key         string    `json:"key"`
	Size        int64     `json:"size"`
	ContentType string    `json:"content_type"`
	CreatedAt   time.Time `json:"created_at"`
	ETag        string    `json:"etag,omitempty"`
}

// ListRequest bounds a list operation.
type ListRequest struct {
	Scope    Scope
	ScopeID  uuid.UUID
	MaxItems int // max 100
}

// ObjectStore hides the S3 provider behind an interface.
// Put accepts a reader and size for streaming (avoids buffering entire file).
type ObjectStore interface {
	// Put uploads from reader to the key.
	// Returns ETag and any error.
	Put(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (etag string, err error)

	// Delete removes the key. Does not error if not found.
	Delete(ctx context.Context, key string) error

	// List returns objects under a prefix, limited to 1000.
	List(ctx context.Context, prefix string) ([]Object, error)

	// PresignGet returns a temporary presigned URL valid for ttl.
	PresignGet(ctx context.Context, key string, ttl time.Duration) (url string, err error)
}

// Config holds S3 connection parameters.
type Config struct {
	Endpoint              string
	Region                string
	Bucket                string
	AccessKeyID           string
	SecretAccessKey       string
	MaxImageUploadBytes   int64         // e.g., 10 MB for images (league, team, player)
	MaxReleaseUploadBytes int64         // e.g., 150 MB for app releases
	PresignTTL            time.Duration // e.g., 7 days for presigned URLs
	PublicBaseURL         string        // e.g., "https://s3.wasabisys.com/bucket" for direct public access (images only)
}

// UploadRequest is the multipart form data from a client.
type UploadRequest struct {
	Body    io.Reader
	Size    int64
	Scope   Scope
	ScopeID uuid.UUID
}

// DeleteRequest is sent as JSON to delete an object.
type DeleteRequest struct {
	Key string `json:"key"`
}

// Validate checks that the delete request is well-formed.
func (r DeleteRequest) Validate() map[string]string {
	fields := make(map[string]string)
	if r.Key == "" {
		fields["key"] = "required"
	}
	return fields
}

// URLRequest gets a presigned URL for reading.
type URLRequest struct {
	Key string `query:"key"`
}

// Validate checks that the URL request is well-formed.
func (r URLRequest) Validate() map[string]string {
	fields := make(map[string]string)
	if r.Key == "" {
		fields["key"] = "required"
	}
	return fields
}

// keyRegex validates the strict key format: {scope}/{uuid}/{uuid}.{ext}
var keyRegex = regexp.MustCompile(`^(league|team|player|app_releases|player_document)/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|apk|pdf)$`)

// ParseKey validates and parses a key into scope and scope_id.
// Returns error if key is invalid.
func ParseKey(key string) (scope Scope, scopeID uuid.UUID, err error) {
	m := keyRegex.FindStringSubmatch(key)
	if m == nil {
		return "", uuid.Nil, ErrInvalidKeyFormat
	}
	scopeID, err = uuid.Parse(m[2])
	if err != nil {
		return "", uuid.Nil, ErrInvalidKeyFormat
	}
	return Scope(m[1]), scopeID, nil
}

// ErrInvalidKeyFormat is returned when a key doesn't match the expected format.
type keyFormatError struct{}

func (keyFormatError) Error() string { return "invalid key format" }

// ErrInvalidKeyFormat singleton.
var ErrInvalidKeyFormat = keyFormatError{}

// IsPublicScope returns true if the scope serves public assets.
func IsPublicScope(s Scope) bool {
	switch s {
	case ScopeLeague, ScopeTeam, ScopePlayer:
		return true
	default:
		return false
	}
}

// IsImageScope returns true if the scope only accepts images.
func IsImageScope(s Scope) bool {
	switch s {
	case ScopeLeague, ScopeTeam, ScopePlayer:
		return true
	default:
		return false
	}
}

// AllowedContentTypes returns the allowed content types for a scope.
func AllowedContentTypes(s Scope) map[string]string {
	switch s {
	case ScopeLeague, ScopeTeam, ScopePlayer:
		// Images: content-type -> extension
		return map[string]string{
			"image/jpeg": ".jpg",
			"image/png":  ".png",
			"image/webp": ".webp",
		}
	case ScopeAppReleases:
		// APK files are detected as zip
		return map[string]string{
			"application/zip": ".apk",
		}
	case ScopePlayerDocument:
		// Photos or scans of the identity document.
		return map[string]string{
			"image/jpeg":      ".jpg",
			"image/png":       ".png",
			"image/webp":      ".webp",
			"application/pdf": ".pdf",
		}
	default:
		return nil
	}
}

// MaxUploadBytesForScope returns the max upload size for a scope.
func (cfg Config) MaxUploadBytesForScope(s Scope) int64 {
	if s == ScopeAppReleases {
		return cfg.MaxReleaseUploadBytes
	}
	return cfg.MaxImageUploadBytes
}
