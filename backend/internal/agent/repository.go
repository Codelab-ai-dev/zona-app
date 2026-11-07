package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// ErrNotLinked means the caller has no active league to query.
var ErrNotLinked = errors.New("caller is not linked to an active league")

// PGRepository implements IdentityResolver, KnowledgeSearcher and
// ConversationStore. Every query is parameterized and league-scoped.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository builds the agent repository.
func NewPGRepository(db database.Querier) *PGRepository { return &PGRepository{db: db} }

// ByWhatsApp resolves an active WhatsApp link to its active league.
func (r *PGRepository) ByWhatsApp(ctx context.Context, phone string) (Identity, error) {
	const q = `
		SELECT w.id, w.user_id, COALESCE(w.display_name, ''), w.role, l.id, l.name, w.tournament_id
		FROM public.whatsapp_user_links w
		JOIN public.leagues l ON l.id = w.league_id AND l.is_active
		WHERE w.phone_number = $1 AND COALESCE(w.is_active, true)
		ORDER BY w.updated_at DESC NULLS LAST
		LIMIT 1`
	id := Identity{Channel: ChannelWhatsApp, PhoneNumber: phone}
	var linkID uuid.UUID
	err := r.db.QueryRow(ctx, q, phone).Scan(&linkID, &id.UserID, &id.DisplayName, &id.Role, &id.LeagueID, &id.LeagueName, &id.TournamentID)
	if database.IsNoRows(err) {
		return Identity{}, ErrNotLinked
	}
	if err != nil {
		return Identity{}, fmt.Errorf("resolve whatsapp identity: %w", err)
	}
	id.WhatsAppLinkID = &linkID
	return id, r.withTournament(ctx, &id)
}

// ByUser resolves an authenticated user to the league they belong to or
// administer (active leagues only).
func (r *PGRepository) ByUser(ctx context.Context, userID uuid.UUID) (Identity, error) {
	const q = `
		SELECT u.name, COALESCE(u.role::text, 'public'), l.id, l.name
		FROM public.users u
		JOIN public.leagues l ON l.is_active AND (l.id = u.league_id OR l.admin_id = u.id)
		WHERE u.id = $1
		ORDER BY (l.id = u.league_id) DESC, l.created_at
		LIMIT 1`
	uid := userID
	id := Identity{Channel: ChannelWeb, UserID: &uid}
	err := r.db.QueryRow(ctx, q, userID).Scan(&id.DisplayName, &id.Role, &id.LeagueID, &id.LeagueName)
	if database.IsNoRows(err) {
		return Identity{}, ErrNotLinked
	}
	if err != nil {
		return Identity{}, fmt.Errorf("resolve user identity: %w", err)
	}
	return id, r.withTournament(ctx, &id)
}

// withTournament fills the tournament: the link's own one if it belongs to
// the league, otherwise the league's most recent active tournament.
func (r *PGRepository) withTournament(ctx context.Context, id *Identity) error {
	const q = `
		SELECT t.id, t.name FROM public.tournaments t
		WHERE t.league_id = $1 AND ($2::uuid IS NULL OR t.id = $2 OR t.is_active)
		ORDER BY (t.id = $2) DESC NULLS LAST, t.is_active DESC, t.start_date DESC
		LIMIT 1`
	var tid uuid.UUID
	err := r.db.QueryRow(ctx, q, id.LeagueID, id.TournamentID).Scan(&tid, &id.TournamentName)
	if database.IsNoRows(err) {
		id.TournamentID = nil
		return nil
	}
	if err != nil {
		return fmt.Errorf("resolve tournament: %w", err)
	}
	id.TournamentID = &tid
	return nil
}

// Search implements KnowledgeSearcher via match_league_knowledge, always
// filtered by the caller's league.
func (r *PGRepository) Search(ctx context.Context, embedding []float32, leagueID uuid.UUID, tournamentID *uuid.UUID, limit int) ([]KnowledgeChunk, error) {
	const q = `
		SELECT content_type, content, distance
		FROM public.match_league_knowledge($1::vector, 0.7, $2, $3, $4)
		WHERE league_id = $3`
	rows, err := r.db.Query(ctx, q, vectorLiteral(embedding), limit, leagueID, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("search knowledge: %w", err)
	}
	defer rows.Close()
	var out []KnowledgeChunk
	for rows.Next() {
		var c KnowledgeChunk
		if err := rows.Scan(&c.ContentType, &c.Content, &c.Distance); err != nil {
			return nil, fmt.Errorf("scan knowledge: %w", err)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// Save implements ConversationStore.
func (r *PGRepository) Save(ctx context.Context, c ConversationLog) (uuid.UUID, error) {
	const q = `
		INSERT INTO public.agent_conversations (
			channel, user_identifier, whatsapp_link_id, league_id, tournament_id,
			user_message, agent_response, agent_response_tokens, intent, intent_confidence,
			rag_chunks_used, latency_ms, llm_model, delivery_status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, 'sent')
		RETURNING id`
	chunks, err := json.Marshal(map[string]int{"count": c.RAGChunks})
	if err != nil {
		return uuid.Nil, err
	}
	var id uuid.UUID
	err = r.db.QueryRow(ctx, q,
		string(c.Channel), c.UserIdentifier, c.WhatsAppLinkID, c.LeagueID, c.TournamentID,
		c.UserMessage, c.Response, c.Tokens, string(c.Intent), c.Confidence,
		string(chunks), int(c.Latency.Milliseconds()), c.Model,
	).Scan(&id)
	if err != nil {
		return uuid.Nil, fmt.Errorf("save conversation: %w", err)
	}
	return id, nil
}

func vectorLiteral(v []float32) string {
	var b strings.Builder
	b.WriteByte('[')
	for i, f := range v {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(strconv.FormatFloat(float64(f), 'g', -1, 32))
	}
	b.WriteByte(']')
	return b.String()
}

// notLinkedError is shown to callers without a league.
var notLinkedError = &httpx.Error{Status: 403, Code: "not_linked", Message: "Tu cuenta no está vinculada a una liga activa"}
