package httpx

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5/middleware"
)

func errorJSON(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var body struct {
		Error map[string]any `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode %q: %v", rec.Body, err)
	}
	return body.Error
}

// Error bodies carry the request ID so users can quote it to support (#54).
func TestWriteErrorIncludesRequestID(t *testing.T) {
	var logs bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	t.Cleanup(func() { slog.SetDefault(prev) })

	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.RequestIDKey, "abc234defg"))

	t.Run("4xx", func(t *testing.T) {
		rec := httptest.NewRecorder()
		WriteError(rec, req, ErrNotFound)
		if got := errorJSON(t, rec)["request_id"]; got != "abc234defg" {
			t.Fatalf("request_id = %v", got)
		}
	})

	t.Run("5xx is logged with the same ID", func(t *testing.T) {
		logs.Reset()
		rec := httptest.NewRecorder()
		WriteError(rec, req, errors.New("db exploded"))
		body := errorJSON(t, rec)
		if body["request_id"] != "abc234defg" || body["code"] != "internal_error" {
			t.Fatalf("body = %v", body)
		}
		if strings.Contains(rec.Body.String(), "db exploded") {
			t.Fatal("internal cause leaked")
		}
		var line map[string]any
		if err := json.Unmarshal(logs.Bytes(), &line); err != nil {
			t.Fatalf("log %q: %v", logs.String(), err)
		}
		if line["msg"] != "request failed" || line["request_id"] != "abc234defg" {
			t.Fatalf("log = %v", line)
		}
	})

	t.Run("no ID in context: field omitted", func(t *testing.T) {
		rec := httptest.NewRecorder()
		WriteError(rec, httptest.NewRequest(http.MethodGet, "/x", nil), ErrForbidden)
		if _, ok := errorJSON(t, rec)["request_id"]; ok {
			t.Fatal("empty request_id serialized")
		}
	})
}
