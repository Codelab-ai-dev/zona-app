package httpx

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestParsePage(t *testing.T) {
	tests := []struct {
		query      string
		wantLimit  int
		wantOffset int
		wantErr    bool
	}{
		{"", DefaultPageLimit, 0, false},
		{"limit=10&offset=20", 10, 20, false},
		{"limit=1000", MaxPageLimit, 0, false},
		{"limit=0", 0, 0, true},
		{"limit=abc", 0, 0, true},
		{"offset=-1", 0, 0, true},
	}
	for _, tt := range tests {
		t.Run(tt.query, func(t *testing.T) {
			p, err := ParsePage(httptest.NewRequest(http.MethodGet, "/?"+tt.query, nil))
			if tt.wantErr {
				if AsError(err).Status != http.StatusUnprocessableEntity {
					t.Fatalf("err = %v, want 422", err)
				}
				return
			}
			if err != nil || p.Limit != tt.wantLimit || p.Offset != tt.wantOffset {
				t.Fatalf("got %+v, %v", p, err)
			}
		})
	}
}

func TestListNeverEncodesNull(t *testing.T) {
	rec := httptest.NewRecorder()
	var none []string
	List(rec, none, Page{Limit: 50})
	if body := rec.Body.String(); !strings.Contains(body, `"data":[]`) {
		t.Fatalf("body = %s, want empty array", body)
	}
}
