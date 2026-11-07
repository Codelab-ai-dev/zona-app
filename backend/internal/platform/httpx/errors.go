// Package httpx contains shared HTTP helpers: JSON encoding/decoding and a
// typed error that maps domain failures to safe client responses.
package httpx

import (
	"errors"
	"net/http"
)

// Error is a client-safe error. Message is shown to the caller; the wrapped
// cause is only logged and never serialized.
type Error struct {
	Status  int
	Code    string
	Message string
	Fields  map[string]string
	cause   error
}

func (e *Error) Error() string {
	if e.cause != nil {
		return e.Code + ": " + e.cause.Error()
	}
	return e.Code + ": " + e.Message
}

func (e *Error) Unwrap() error { return e.cause }

// Is makes errors.Is match by Code, so wrapped copies (see Wrap) still
// compare equal to the sentinel they were derived from.
func (e *Error) Is(target error) bool {
	t, ok := target.(*Error)
	return ok && t.Code == e.Code
}

// Wrap attaches an internal cause (for logs) to a client-safe error.
func (e *Error) Wrap(cause error) *Error {
	cp := *e
	cp.cause = cause
	return &cp
}

// Common errors. Prefer these over ad-hoc status codes.
var (
	ErrBadRequest   = &Error{Status: http.StatusBadRequest, Code: "bad_request", Message: "Solicitud inválida"}
	ErrUnauthorized = &Error{Status: http.StatusUnauthorized, Code: "unauthorized", Message: "Autenticación requerida"}
	ErrForbidden    = &Error{Status: http.StatusForbidden, Code: "forbidden", Message: "No tienes permiso para esta acción"}
	ErrNotFound     = &Error{Status: http.StatusNotFound, Code: "not_found", Message: "Recurso no encontrado"}
	ErrConflict     = &Error{Status: http.StatusConflict, Code: "conflict", Message: "El recurso ya existe o está en conflicto"}
	ErrTooLarge     = &Error{Status: http.StatusRequestEntityTooLarge, Code: "payload_too_large", Message: "La solicitud es demasiado grande"}
	ErrRateLimited  = &Error{Status: http.StatusTooManyRequests, Code: "rate_limited", Message: "Demasiadas solicitudes, intenta más tarde"}
	ErrInternal     = &Error{Status: http.StatusInternalServerError, Code: "internal_error", Message: "Error interno del servidor"}
)

// Validation builds a 422 error with per-field messages.
func Validation(fields map[string]string) *Error {
	return &Error{
		Status:  http.StatusUnprocessableEntity,
		Code:    "validation_failed",
		Message: "Los datos enviados no son válidos",
		Fields:  fields,
	}
}

// AsError converts any error into an *Error, defaulting to ErrInternal so
// unexpected failures never leak details to clients.
func AsError(err error) *Error {
	var he *Error
	if errors.As(err, &he) {
		return he
	}
	return ErrInternal.Wrap(err)
}
