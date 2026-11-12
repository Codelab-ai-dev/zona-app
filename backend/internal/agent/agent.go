// Package agent is the league assistant answering questions over WhatsApp,
// web and mobile. It is read-only by design: it gathers league data (SQL and
// the RAG knowledge base), asks an LLM to phrase the answer, and never lets
// the model trigger writes or choose which league to read.
//
// Security model:
//   - The caller's identity comes from the bearer token (web/mobile) or from a
//     Kapso webhook whose HMAC signature was verified (WhatsApp). The request
//     body never decides who the caller is or which league is read.
//   - League/tournament scope is resolved server-side from that identity.
//   - User text and retrieved data are passed to the LLM as delimited data,
//     never concatenated into the system prompt.
package agent

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Channel is where a message came from.
type Channel string

const (
	ChannelWhatsApp Channel = "whatsapp"
	ChannelWeb      Channel = "web"
	ChannelMobile   Channel = "mobile"
)

// Intent is the classified purpose of a message (mirrors the legacy types).
type Intent string

const (
	IntentCalendar     Intent = "calendario"
	IntentResults      Intent = "resultados"
	IntentNextMatches  Intent = "proximos_partidos"
	IntentStandings    Intent = "tabla_posiciones"
	IntentSuspensions  Intent = "suspensiones"
	IntentStatistics   Intent = "estadisticas"
	IntentRules        Intent = "reglamento"
	IntentPayments     Intent = "pagos"
	IntentGeneralInfo  Intent = "informacion_general"
	IntentConversation Intent = "conversacion"
	IntentUnknown      Intent = "unknown"
)

// Entities are values extracted from the message text.
type Entities struct {
	Round    *int   // "jornada 5"
	TeamName string // free text, used only as a parameterized ILIKE filter
}

// Classification is the output of the intent router.
type Classification struct {
	Intent     Intent
	Confidence float64 // 0..1
	Entities   Entities
}

// Identity is the resolved caller with the league scope they may query.
type Identity struct {
	Channel        Channel
	UserID         *uuid.UUID
	PhoneNumber    string // WhatsApp only; never logged in full
	DisplayName    string
	Role           string
	WhatsAppLinkID *uuid.UUID
	LeagueID       uuid.UUID
	LeagueName     string
	TournamentID   *uuid.UUID
	TournamentName string
}

// MessageRequest is the body of POST /agent/messages (web/mobile).
// It intentionally has no user or league fields.
type MessageRequest struct {
	Message string `json:"message"`
}

// MaxMessageRunes bounds user input sent to the LLM.
const MaxMessageRunes = 1000

// Validate implements httpx.Validator.
func (r MessageRequest) Validate() map[string]string {
	n := len([]rune(r.Message))
	switch {
	case n == 0:
		return map[string]string{"message": "el mensaje es obligatorio"}
	case n > MaxMessageRunes:
		return map[string]string{"message": "el mensaje es demasiado largo"}
	}
	return nil
}

// Reply is the agent's answer.
type Reply struct {
	Text           string    `json:"text"`
	Intent         Intent    `json:"intent"`
	ConversationID uuid.UUID `json:"conversation_id"`
}

// --- dependencies (implemented in this package or injected) ---

// IdentityResolver maps a caller to its league scope.
type IdentityResolver interface {
	ByWhatsApp(ctx context.Context, phone string) (Identity, error)
	ByUser(ctx context.Context, userID uuid.UUID) (Identity, error)
}

// Classifier detects the intent of a message. It is deterministic (keyword
// based, ported from the legacy router) so the LLM cannot influence routing.
type Classifier interface {
	Classify(message string) Classification
}

// DataProvider fetches the SQL context for an intent, always scoped to the
// identity's league/tournament. It returns plain text for the prompt.
type DataProvider interface {
	Fetch(ctx context.Context, id Identity, c Classification) (string, error)
}

// Embedder turns text into a vector (satisfied by knowledge.OpenAIEmbedder).
type Embedder interface {
	Embed(ctx context.Context, texts []string) ([][]float32, error)
}

// KnowledgeSearcher runs the vector search scoped to a league.
type KnowledgeSearcher interface {
	Search(ctx context.Context, embedding []float32, leagueID uuid.UUID, tournamentID *uuid.UUID, limit int) ([]KnowledgeChunk, error)
}

// KnowledgeChunk is one RAG result.
type KnowledgeChunk struct {
	ContentType string
	Content     string
	Distance    float64
}

// LLM generates the final answer.
type LLM interface {
	Complete(ctx context.Context, messages []ChatMessage) (Completion, error)
}

// ChatMessage is one OpenAI-compatible chat message.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Completion is the LLM result.
type Completion struct {
	Text             string
	Model            string
	CompletionTokens int
}

// ConversationLog is what gets persisted in agent_conversations.
type ConversationLog struct {
	Channel        Channel
	UserIdentifier string
	WhatsAppLinkID *uuid.UUID
	LeagueID       uuid.UUID
	TournamentID   *uuid.UUID
	UserMessage    string
	Response       string
	Intent         Intent
	Confidence     float64
	RAGChunks      int
	Model          string
	Tokens         int
	Latency        time.Duration
}

// ConversationStore persists conversations.
type ConversationStore interface {
	Save(ctx context.Context, c ConversationLog) (uuid.UUID, error)
}

// WhatsAppSender sends a free-form text reply inside the 24h window.
type WhatsAppSender interface {
	SendText(ctx context.Context, to, text string) error
}
