package httpx

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// UUIDParam reads a chi URL parameter and parses it as a UUID.
func UUIDParam(r *http.Request, name string) (uuid.UUID, error) {
	id, err := uuid.Parse(chi.URLParam(r, name))
	if err != nil {
		return uuid.Nil, Validation(map[string]string{name: "debe ser un UUID válido"})
	}
	return id, nil
}

// UUIDQuery reads a required UUID from the query string (?name=...).
func UUIDQuery(r *http.Request, name string) (uuid.UUID, error) {
	id, err := uuid.Parse(r.URL.Query().Get(name))
	if err != nil {
		return uuid.Nil, Validation(map[string]string{name: "debe ser un UUID válido"})
	}
	return id, nil
}
