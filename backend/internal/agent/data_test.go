package agent

import (
	"testing"
	"time"
)

func TestEscapeILike(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "simple team name",
			input:    "Local FC",
			expected: "%Local FC%",
		},
		{
			name:     "team name with percent",
			input:    "100% Team",
			expected: "%100\\% Team%",
		},
		{
			name:     "team name with underscore",
			input:    "Team_A",
			expected: "%Team\\_A%",
		},
		{
			name:     "team name with backslash",
			input:    "Team\\Name",
			expected: "%Team\\\\Name%",
		},
		{
			name:     "team name with all special chars",
			input:    "A%B_C\\D",
			expected: "%A\\%B\\_C\\\\D%",
		},
		{
			name:     "SQL injection attempt",
			input:    "a_b' OR 1=1 --",
			expected: "%a\\_b' OR 1=1 --%",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := escapeILike(tt.input)
			if got != tt.expected {
				t.Errorf("escapeILike(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestTruncateToChars(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "short text",
			input:    "hello world",
			expected: "hello world",
		},
		{
			name:     "text at limit",
			input:    string(make([]byte, 6000)),
			expected: string(make([]byte, 6000)),
		},
		{
			name:     "text exceeds limit",
			input:    string(make([]byte, 6010)),
			expected: string(make([]byte, 5997)) + "...",
		},
		{
			name:     "long text",
			input:    string(make([]byte, 10000)),
			expected: string(make([]byte, 5997)) + "...",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := truncateToChars(tt.input)
			if len(got) != len(tt.expected) {
				t.Errorf("truncateToChars(%d chars) produced %d chars, want %d",
					len(tt.input), len(got), len(tt.expected))
			}
			if tt.input != tt.expected && got != tt.expected {
				t.Errorf("truncateToChars mismatch: got length %d, want %d", len(got), len(tt.expected))
			}
		})
	}
}

func TestFormatMatchesForLLM(t *testing.T) {
	now := time.Now()
	tests := []struct {
		name     string
		matches  []matchRow
		contains string
	}{
		{
			name:     "empty matches",
			matches:  []matchRow{},
			contains: "No se encontraron partidos.",
		},
		{
			name: "finished match with round",
			matches: []matchRow{
				{
					round:     ptrInt(1),
					homeTeam:  "Local FC",
					awayTeam:  "Visita FC",
					homeScore: ptrInt(2),
					awayScore: ptrInt(1),
					matchDate: now,
					status:    "finished",
				},
			},
			contains: "Jornada 1:",
		},
		{
			name: "scheduled match",
			matches: []matchRow{
				{
					round:     ptrInt(1),
					homeTeam:  "Local FC",
					awayTeam:  "Visita FC",
					matchDate: now,
					matchTime: ptrString("18:30"),
					status:    "scheduled",
				},
			},
			contains: "vs",
		},
		{
			name: "match without time",
			matches: []matchRow{
				{
					homeTeam:  "Local FC",
					awayTeam:  "Visita FC",
					matchDate: now,
					status:    "scheduled",
				},
			},
			contains: "Local FC vs Visita FC",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatMatchesForLLM(tt.matches)
			if tt.contains != "" && !contains(got, tt.contains) {
				t.Errorf("formatMatchesForLLM output does not contain %q:\n%s", tt.contains, got)
			}
		})
	}
}

func TestFormatStandingsForLLM(t *testing.T) {
	standings := []standingRow{
		{
			teamName:       "Local FC",
			points:         12,
			played:         4,
			won:            4,
			drawn:          0,
			lost:           0,
			goalsFor:       10,
			goalsAgainst:   2,
			goalDifference: 8,
		},
		{
			teamName:       "Visita FC",
			points:         9,
			played:         4,
			won:            3,
			drawn:          0,
			lost:           1,
			goalsFor:       9,
			goalsAgainst:   3,
			goalDifference: 6,
		},
	}

	got := formatStandingsForLLM(standings)

	if !contains(got, "TABLA DE POSICIONES") {
		t.Errorf("formatStandingsForLLM should contain 'TABLA DE POSICIONES'")
	}
	if !contains(got, "Local FC") {
		t.Errorf("formatStandingsForLLM should contain 'Local FC'")
	}
	if !contains(got, "12pts") {
		t.Errorf("formatStandingsForLLM should contain '12pts'")
	}
	if !contains(got, "GD:+8") {
		t.Errorf("formatStandingsForLLM should contain 'GD:+8'")
	}
}

func TestFormatScorersForLLM(t *testing.T) {
	scorers := []scorerRow{
		{
			playerName: "Player One",
			teamName:   "Local FC",
			goals:      5,
			assists:    2,
		},
		{
			playerName: "Player Two",
			teamName:   "Visita FC",
			goals:      3,
			assists:    0,
		},
	}

	got := formatScorersForLLM(scorers)

	if !contains(got, "Tabla de Goleadores") {
		t.Errorf("formatScorersForLLM should contain 'Tabla de Goleadores'")
	}
	if !contains(got, "Player One") {
		t.Errorf("formatScorersForLLM should contain 'Player One'")
	}
	if !contains(got, "5 goles") {
		t.Errorf("formatScorersForLLM should contain '5 goles'")
	}
	if !contains(got, "2 asistencias") {
		t.Errorf("formatScorersForLLM should contain '2 asistencias'")
	}
}

func TestFormatScorersEmptyList(t *testing.T) {
	scorers := []scorerRow{}
	got := formatScorersForLLM(scorers)
	expected := "No hay estadísticas de goleadores disponibles."
	if got != expected {
		t.Errorf("formatScorersForLLM(empty) = %q, want %q", got, expected)
	}
}

// Helper functions
func contains(s, substr string) bool {
	for i := 0; i < len(s); i++ {
		match := true
		for j := 0; j < len(substr); j++ {
			if i+j >= len(s) || s[i+j] != substr[j] {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}

func ptrInt(i int) *int {
	return &i
}

func ptrString(s string) *string {
	return &s
}
