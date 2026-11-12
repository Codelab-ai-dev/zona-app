package agent

import (
	"regexp"
	"strconv"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

// intentPattern defines keywords and weight for an intent.
type intentPattern struct {
	keywords []string
	weight   int
}

// KeywordClassifier implements the Classifier interface using keyword matching.
// It is pure and deterministic: no I/O, no LLM, no runtime mutations.
type KeywordClassifier struct{}

// NewKeywordClassifier creates a new keyword-based classifier.
func NewKeywordClassifier() *KeywordClassifier {
	return &KeywordClassifier{}
}

// intentOrder is the declaration order of INTENT_PATTERNS in the legacy
// router; it decides ties.
var intentOrder = []Intent{
	IntentCalendar, IntentResults, IntentNextMatches, IntentStandings, IntentSuspensions,
	IntentStatistics, IntentRules, IntentPayments, IntentGeneralInfo, IntentConversation, IntentUnknown,
}

// intentPatterns maps each intent to keyword patterns with weights.
// Ported faithfully from the legacy TypeScript router.
var intentPatterns = map[Intent][]intentPattern{
	IntentCalendar: {
		{keywords: []string{"jornada", "round", "fecha"}, weight: 10},
		{keywords: []string{"cuando", "cuándo", "día", "hora"}, weight: 8},
		{keywords: []string{"horario", "calendario"}, weight: 10},
		{keywords: []string{"partidos", "juegos", "encuentros"}, weight: 7},
		{keywords: []string{"esta semana", "próxima semana", "proxima semana", "fin de semana"}, weight: 9},
	},
	IntentResults: {
		{keywords: []string{"resultado", "resultados", "marcador", "marcadores"}, weight: 15},
		{keywords: []string{"gano", "ganó", "ganaron", "perdio", "perdió", "perdieron", "empato", "empataron"}, weight: 9},
		{keywords: []string{"goles", "anoto", "anotó", "anotaron", "metio"}, weight: 8},
		{keywords: []string{"como quedo", "cómo quedó", "cuanto quedo", "cuánto quedó", "como quedaron"}, weight: 12},
		{keywords: []string{"ultimo partido", "últimos partidos", "score", "scores"}, weight: 8},
	},
	IntentNextMatches: {
		{keywords: []string{"proximo", "próximo", "siguiente"}, weight: 10},
		{keywords: []string{"jugara", "jugará", "juega", "jugar"}, weight: 9},
		{keywords: []string{"contra", "vs", "versus"}, weight: 8},
		{keywords: []string{"cuando juega", "cuándo juega"}, weight: 10},
	},
	IntentStandings: {
		{keywords: []string{"tabla", "posiciones"}, weight: 10},
		{keywords: []string{"puntaje", "puntos", "puntuacion"}, weight: 9},
		{keywords: []string{"primero", "segundo", "tercero", "lider"}, weight: 8},
		{keywords: []string{"clasificacion", "ranking"}, weight: 9},
		{keywords: []string{"quien va ganando", "quién va ganando"}, weight: 10},
	},
	IntentSuspensions: {
		{keywords: []string{"suspendido", "suspendidos", "sancionado", "sancionados"}, weight: 10},
		{keywords: []string{"tarjeta", "tarjetas", "roja", "rojas", "amarilla", "amarillas"}, weight: 9},
		{keywords: []string{"expulsado", "expulsados"}, weight: 10},
		{keywords: []string{"castigado", "castigados"}, weight: 8},
		{keywords: []string{"no puede jugar", "baja"}, weight: 7},
	},
	IntentStatistics: {
		{keywords: []string{"estadistica", "estadisticas", "stats"}, weight: 10},
		{keywords: []string{"goleador", "goleadores", "maximo goleador"}, weight: 9},
		{keywords: []string{"asistencias", "asistidor"}, weight: 8},
		{keywords: []string{"mejor", "peor"}, weight: 6},
	},
	IntentRules: {
		{keywords: []string{"regla", "reglas", "reglamento"}, weight: 10},
		{keywords: []string{"norma", "normas"}, weight: 9},
		{keywords: []string{"permitido", "permitir", "prohibido"}, weight: 7},
		{keywords: []string{"como funciona", "cómo funciona"}, weight: 8},
	},
	IntentPayments: {
		{keywords: []string{"pago", "pagos", "cuota", "inscripcion"}, weight: 10},
		{keywords: []string{"debo", "adeudo", "deuda"}, weight: 9},
		{keywords: []string{"costo", "precio", "cuanto cuesta"}, weight: 8},
	},
	IntentGeneralInfo: {
		{keywords: []string{"informacion", "info"}, weight: 8},
		{keywords: []string{"que es", "qué es", "cual es", "cuál es"}, weight: 7},
		{keywords: []string{"donde", "dónde", "ubicacion"}, weight: 7},
		{keywords: []string{"contacto", "telefono", "email"}, weight: 8},
	},
	IntentConversation: {
		{keywords: []string{"hola", "buenos dias", "buenas tardes", "buenas noches"}, weight: 10},
		{keywords: []string{"gracias", "thank", "ok", "perfecto"}, weight: 8},
		{keywords: []string{"ayuda", "help", "que puedes hacer", "qué puedes hacer"}, weight: 9},
	},
	IntentUnknown: {}, // No keywords for unknown
}

// Classify detects the intent of a message using keyword matching.
// Returns Classification with Intent, Confidence [0,1], and extracted Entities.
func (kc *KeywordClassifier) Classify(message string) Classification {
	if message == "" {
		return Classification{
			Intent:     IntentUnknown,
			Confidence: 0,
			Entities:   Entities{},
		}
	}

	normalized := normalizeText(message)

	// Score intents in the legacy declaration order. With a strict ">" the
	// first-declared intent wins ties, exactly like the TypeScript router;
	// ranging over the map would make ties random.
	maxScore := 0.0
	detectedIntent := IntentUnknown
	for _, intent := range intentOrder {
		if score := calculateScore(normalized, intentPatterns[intent]); score > maxScore {
			maxScore = score
			detectedIntent = intent
		}
	}

	// Apply threshold: score must be >= 5 to avoid unknown
	const confidenceThreshold = 5
	if maxScore < confidenceThreshold {
		detectedIntent = IntentUnknown
	}

	// Calculate confidence (0-1): score / 20, capped at 1.0
	confidence := maxScore / 20
	if confidence > 1.0 {
		confidence = 1.0
	}

	// Extract entities from normalized message
	entities := extractEntities(normalized, detectedIntent)

	return Classification{
		Intent:     detectedIntent,
		Confidence: confidence,
		Entities:   entities,
	}
}

// normalizeText applies lowercase, accent removal, and punctuation cleanup
// following the legacy TypeScript implementation exactly.
func normalizeText(text string) string {
	// Convert to lowercase
	text = strings.ToLower(text)

	// Remove accents using Unicode NFD (Canonical Decomposition)
	// followed by filtering out combining marks (category Mn)
	normalized := norm.NFD.String(text)
	var result strings.Builder
	for _, r := range normalized {
		// Skip combining diacritical marks
		if !unicode.Is(unicode.Mn, r) {
			result.WriteRune(r)
		}
	}

	// Remove question/exclamation marks
	cleaned := result.String()
	cleaned = strings.ReplaceAll(cleaned, "¿", "")
	cleaned = strings.ReplaceAll(cleaned, "?", "")
	cleaned = strings.ReplaceAll(cleaned, "¡", "")
	cleaned = strings.ReplaceAll(cleaned, "!", "")

	return strings.TrimSpace(cleaned)
}

// calculateScore returns the sum of weights for matched keyword patterns.
func calculateScore(message string, patterns []intentPattern) float64 {
	score := 0.0
	for _, pattern := range patterns {
		found := false
		for _, keyword := range pattern.keywords {
			// Apply lowercase (defensive; message is already normalized)
			keyword = strings.ToLower(keyword)
			if strings.Contains(message, keyword) {
				found = true
				break
			}
		}
		if found {
			score += float64(pattern.weight)
		}
	}
	return score
}

// extractEntities extracts Round and TeamName from the normalized message.
func extractEntities(normalized string, intent Intent) Entities {
	entities := Entities{}

	// Extract round number: "jornada N", "fecha N", or "round N"
	// Round must be in range [1, 99]
	roundPatterns := []string{
		`jornada\s+(\d+)`,
		`fecha\s+(\d+)`,
		`round\s+(\d+)`,
	}

	for _, pattern := range roundPatterns {
		re := regexp.MustCompile(pattern)
		match := re.FindStringSubmatch(normalized)
		if len(match) > 1 {
			if num, err := strconv.Atoi(match[1]); err == nil && num > 0 && num <= 99 {
				entities.Round = &num
				break
			}
		}
	}

	// Extract team name from patterns like "equipo X", "contra X", or "vs X"
	// Trim result and cap at 50 runes
	teamPatterns := []string{
		`equipo\s+([a-záéíóúñ\s]+)`,
		`contra\s+([a-záéíóúñ\s]+)`,
		`vs\s+([a-záéíóúñ\s]+)`,
	}

	for _, pattern := range teamPatterns {
		re := regexp.MustCompile(pattern)
		match := re.FindStringSubmatch(normalized)
		if len(match) > 1 {
			teamName := strings.TrimSpace(match[1])
			// Cap at 50 runes
			if len([]rune(teamName)) > 50 {
				teamName = string([]rune(teamName)[:50])
			}
			entities.TeamName = teamName
			break
		}
	}

	return entities
}
