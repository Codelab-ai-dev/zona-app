package httpx

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
)

// DefaultMaxBodyBytes caps JSON request bodies unless a handler opts into more.
const DefaultMaxBodyBytes int64 = 1 << 20 // 1 MiB

// JSON writes v as a JSON response with the given status.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("encode response", "err", err)
	}
}

type errorBody struct {
	Error errorPayload `json:"error"`
}

type errorPayload struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// WriteError serializes err as a safe JSON error. 5xx causes are logged.
func WriteError(w http.ResponseWriter, r *http.Request, err error) {
	he := AsError(err)
	if he.Status >= http.StatusInternalServerError {
		slog.ErrorContext(r.Context(), "request failed",
			"method", r.Method, "path", r.URL.Path, "err", err)
	}
	JSON(w, he.Status, errorBody{Error: errorPayload{Code: he.Code, Message: he.Message, Fields: he.Fields}})
}

// Validator is implemented by request DTOs that can validate themselves.
// It returns a map of field -> message, empty when valid.
type Validator interface {
	Validate() map[string]string
}

// DecodeJSON decodes a size-limited JSON body into dst, rejecting unknown
// fields and trailing data, then runs dst.Validate() if implemented.
func DecodeJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	if ct := r.Header.Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		return &Error{Status: http.StatusUnsupportedMediaType, Code: "unsupported_media_type", Message: "Se esperaba application/json"}
	}
	r.Body = http.MaxBytesReader(w, r.Body, DefaultMaxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			return ErrTooLarge
		}
		return ErrBadRequest.Wrap(err)
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return ErrBadRequest.Wrap(errors.New("body must contain a single JSON object"))
	}

	if v, ok := dst.(Validator); ok {
		if fields := v.Validate(); len(fields) > 0 {
			return Validation(fields)
		}
	}
	return nil
}
