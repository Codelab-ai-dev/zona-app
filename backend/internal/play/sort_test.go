package play

import "testing"

func TestClipOrderBy(t *testing.T) {
	tests := []struct {
		sortBy, sortOrder, want string
	}{
		{"views_count", "asc", " ORDER BY views_count ASC"},
		{"likes_count", "desc", " ORDER BY likes_count DESC"},
		{"", "", " ORDER BY created_at DESC"},
		{"created_at; DROP TABLE video_clips; --", "asc", " ORDER BY created_at ASC"},
		{"(SELECT encrypted_password FROM auth.users LIMIT 1)", "desc", " ORDER BY created_at DESC"},
		{"views_count", "asc; DELETE", " ORDER BY views_count DESC"},
	}
	for _, tt := range tests {
		if got := clipOrderBy(tt.sortBy, tt.sortOrder); got != tt.want {
			t.Errorf("clipOrderBy(%q, %q) = %q, want %q", tt.sortBy, tt.sortOrder, got, tt.want)
		}
	}
}
