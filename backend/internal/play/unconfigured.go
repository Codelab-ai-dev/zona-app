package play

import (
	"context"
	"net/http"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// errVideoUnavailable is returned by operations that need Mux when it is not
// configured. Reads from the database keep working (empty lists locally).
var errVideoUnavailable = &httpx.Error{
	Status:  http.StatusServiceUnavailable,
	Code:    "video_unavailable",
	Message: "El servicio de video no está configurado",
}

// UnconfiguredProvider is the VideoProvider used without Mux credentials.
type UnconfiguredProvider struct{}

func (UnconfiguredProvider) CreateDirectUpload(context.Context) (string, string, error) {
	return "", "", errVideoUnavailable
}

func (UnconfiguredProvider) GetAsset(context.Context, string) (string, int, string, error) {
	return "", 0, "", errVideoUnavailable
}

func (UnconfiguredProvider) DeleteAsset(context.Context, string) error { return errVideoUnavailable }

func (UnconfiguredProvider) CreateLiveStream(context.Context, string) (string, string, string, error) {
	return "", "", "", errVideoUnavailable
}

func (UnconfiguredProvider) GetLiveStream(context.Context, string) (string, error) {
	return "", errVideoUnavailable
}

func (UnconfiguredProvider) DeleteLiveStream(context.Context, string) error {
	return errVideoUnavailable
}
