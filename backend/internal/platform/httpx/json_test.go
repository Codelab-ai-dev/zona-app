package httpx

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type sampleDTO struct {
	Name string `json:"name"`
}

func (s sampleDTO) Validate() map[string]string {
	if s.Name == "" {
		return map[string]string{"name": "requerido"}
	}
	return nil
}

func TestDecodeJSON(t *testing.T) {
	tests := []struct {
		name        string
		contentType string
		body        string
		wantStatus  int // 0 = success
	}{
		{name: "valid", contentType: "application/json", body: `{"name":"x"}`},
		{name: "wrong content type", contentType: "text/plain", body: `{"name":"x"}`, wantStatus: http.StatusUnsupportedMediaType},
		{name: "unknown field", contentType: "application/json", body: `{"name":"x","admin":true}`, wantStatus: http.StatusBadRequest},
		{name: "trailing data", contentType: "application/json", body: `{"name":"x"}{"name":"y"}`, wantStatus: http.StatusBadRequest},
		{name: "malformed", contentType: "application/json", body: `{"name":`, wantStatus: http.StatusBadRequest},
		{name: "fails validation", contentType: "application/json", body: `{"name":""}`, wantStatus: http.StatusUnprocessableEntity},
		{name: "too large", contentType: "application/json", body: `{"name":"` + strings.Repeat("a", int(DefaultMaxBodyBytes)) + `"}`, wantStatus: http.StatusRequestEntityTooLarge},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", tt.contentType)
			var dst sampleDTO
			err := DecodeJSON(httptest.NewRecorder(), req, &dst)

			if tt.wantStatus == 0 {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				return
			}
			if got := AsError(err).Status; got != tt.wantStatus {
				t.Fatalf("status = %d, want %d (err=%v)", got, tt.wantStatus, err)
			}
		})
	}
}

func TestWriteErrorHidesInternalCause(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	WriteError(rec, req, errors.New("pq: password authentication failed for user zona"))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d", rec.Code)
	}
	if strings.Contains(rec.Body.String(), "password") {
		t.Fatalf("internal error leaked: %s", rec.Body.String())
	}
}
