package agent

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// fallbackReply is sent when the LLM is unavailable.
const fallbackReply = "Lo siento, no pude procesar tu mensaje en este momento. Intenta de nuevo en unos minutos. ⚽"

// notLinkedReply is sent to WhatsApp numbers without an active league link.
const notLinkedReply = "Tu número no está vinculado a ninguna liga activa. Pide al administrador de tu liga que te registre. ⚽"

// Deps groups the Service collaborators. Embedder/Knowledge are optional:
// without them the agent answers from SQL data only.
type Deps struct {
	Identities    IdentityResolver
	Classifier    Classifier
	Data          DataProvider
	Embedder      Embedder
	Knowledge     KnowledgeSearcher
	LLM           LLM
	Conversations ConversationStore
}

// Service answers messages for a resolved identity.
type Service struct {
	d       Deps
	limiter *keyedLimiter
	now     func() time.Time
}

// NewService builds the agent service. Each caller (user id or phone) may
// send up to 10 messages per minute: every message costs an LLM call.
func NewService(d Deps) *Service {
	return &Service{d: d, limiter: newKeyedLimiter(rate.Every(6*time.Second), 10), now: time.Now}
}

// ErrRateLimited is returned when a caller exceeds its message budget.
var ErrRateLimited = errors.New("agent rate limit exceeded")

// Ask classifies, gathers league-scoped context, asks the LLM and logs the
// conversation. Context failures degrade the answer instead of failing it.
func (s *Service) Ask(ctx context.Context, id Identity, message string) (Reply, error) {
	if !s.limiter.allow(rateKey(id)) {
		return Reply{}, ErrRateLimited
	}
	start := s.now()
	c := s.d.Classifier.Classify(message)

	sqlContext, err := s.d.Data.Fetch(ctx, id, c)
	if err != nil {
		slog.WarnContext(ctx, "agent data fetch failed", "intent", c.Intent, "err", err)
	}
	chunks := s.searchKnowledge(ctx, id, message)

	completion, err := s.d.LLM.Complete(ctx, buildMessages(id, c, sqlContext, chunks, message))
	if err != nil {
		slog.ErrorContext(ctx, "agent llm failed", "err", err)
		completion = Completion{Text: fallbackReply}
	}

	convID, err := s.d.Conversations.Save(ctx, ConversationLog{
		Channel: id.Channel, UserIdentifier: userIdentifier(id), WhatsAppLinkID: id.WhatsAppLinkID,
		LeagueID: id.LeagueID, TournamentID: id.TournamentID,
		UserMessage: message, Response: completion.Text, Intent: c.Intent, Confidence: c.Confidence,
		RAGChunks: len(chunks), Model: completion.Model, Tokens: completion.CompletionTokens,
		Latency: s.now().Sub(start),
	})
	if err != nil {
		slog.ErrorContext(ctx, "agent conversation not saved", "err", err)
	}
	return Reply{Text: completion.Text, Intent: c.Intent, ConversationID: convID}, nil
}

func (s *Service) searchKnowledge(ctx context.Context, id Identity, message string) []KnowledgeChunk {
	if s.d.Embedder == nil || s.d.Knowledge == nil {
		return nil
	}
	vectors, err := s.d.Embedder.Embed(ctx, []string{message})
	if err != nil || len(vectors) != 1 {
		slog.WarnContext(ctx, "agent embedding failed", "err", err)
		return nil
	}
	chunks, err := s.d.Knowledge.Search(ctx, vectors[0], id.LeagueID, id.TournamentID, 5)
	if err != nil {
		slog.WarnContext(ctx, "agent knowledge search failed", "err", err)
		return nil
	}
	return chunks
}

func rateKey(id Identity) string {
	if id.UserID != nil {
		return "u:" + id.UserID.String()
	}
	return "p:" + id.PhoneNumber
}

// userIdentifier is stored for analytics; phone numbers are masked.
func userIdentifier(id Identity) string {
	if id.UserID != nil {
		return id.UserID.String()
	}
	return maskPhone(id.PhoneNumber)
}

func maskPhone(p string) string {
	if len(p) <= 4 {
		return "****"
	}
	return "****" + p[len(p)-4:]
}

// keyedLimiter is an in-memory token bucket per caller (single instance).
type keyedLimiter struct {
	mu    sync.Mutex
	lim   map[string]*rate.Limiter
	every rate.Limit
	burst int
}

func newKeyedLimiter(every rate.Limit, burst int) *keyedLimiter {
	return &keyedLimiter{lim: map[string]*rate.Limiter{}, every: every, burst: burst}
}

func (k *keyedLimiter) allow(key string) bool {
	k.mu.Lock()
	defer k.mu.Unlock()
	l, ok := k.lim[key]
	if !ok {
		if len(k.lim) > 10000 { // bound memory; buckets refill quickly anyway
			k.lim = map[string]*rate.Limiter{}
		}
		l = rate.NewLimiter(k.every, k.burst)
		k.lim[key] = l
	}
	return l.Allow()
}

// String helps debugging without leaking the phone number.
func (id Identity) String() string {
	return fmt.Sprintf("%s:%s@%s", id.Channel, userIdentifier(id), id.LeagueID)
}
