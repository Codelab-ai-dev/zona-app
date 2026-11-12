package httpx

import (
	"net/http"
	"strconv"
)

const (
	// DefaultPageLimit is used when the client sends no limit.
	DefaultPageLimit = 50
	// MaxPageLimit caps every list endpoint.
	MaxPageLimit = 100
)

// Page describes the slice of a collection returned by a list endpoint.
// Total is omitted when counting would be too expensive for the endpoint.
type Page struct {
	Limit  int  `json:"limit"`
	Offset int  `json:"offset"`
	Total  *int `json:"total,omitempty"`
}

// WithTotal returns a copy of p carrying the total number of items.
func (p Page) WithTotal(total int) Page {
	p.Total = &total
	return p
}

// ListResponse is the envelope of every list endpoint.
type ListResponse[T any] struct {
	Data []T  `json:"data"`
	Page Page `json:"page"`
}

// ParsePage reads ?limit= and ?offset=, applying defaults and bounds.
func ParsePage(r *http.Request) (Page, error) {
	p := Page{Limit: DefaultPageLimit}
	fields := map[string]string{}
	if raw := r.URL.Query().Get("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 {
			fields["limit"] = "debe ser un entero positivo"
		} else {
			p.Limit = min(n, MaxPageLimit)
		}
	}
	if raw := r.URL.Query().Get("offset"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 0 {
			fields["offset"] = "debe ser un entero mayor o igual a 0"
		} else {
			p.Offset = n
		}
	}
	if len(fields) > 0 {
		return Page{}, Validation(fields)
	}
	return p, nil
}

// List writes a 200 list response. A nil slice is encoded as [] so clients
// never have to handle null.
func List[T any](w http.ResponseWriter, items []T, page Page) {
	if items == nil {
		items = []T{}
	}
	JSON(w, http.StatusOK, ListResponse[T]{Data: items, Page: page})
}

// NoContent writes 204 for successful actions that return no body
// (deletes, toggles, fire-and-forget operations).
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}
