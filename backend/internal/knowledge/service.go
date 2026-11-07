package knowledge

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service holds business rules. Authorization decisions live here.
type Service struct {
	repo  Repository
	emb   Embedder
	authz authz.Checker
}

// NewService builds the knowledge service.
func NewService(repo Repository, emb Embedder, authz authz.Checker) *Service {
	return &Service{repo: repo, emb: emb, authz: authz}
}

// CreateEmbedding generates embeddings for direct free-text content.
// Only super_admin can use this endpoint (feeds the RAG system).
func (s *Service) CreateEmbedding(ctx context.Context, caller auth.Principal, req CreateEmbeddingRequest) (KnowledgeBase, error) {
	// Only super_admin allowed for direct free-text embeddings
	if !caller.IsSuperAdmin() {
		return KnowledgeBase{}, httpx.ErrForbidden
	}

	// Generate embedding vector for the content text.
	embeddings, err := s.emb.Embed(ctx, []string{req.ContentText})
	if err != nil {
		return KnowledgeBase{}, fmt.Errorf("generate embedding: %w", err)
	}

	if len(embeddings) != 1 {
		return KnowledgeBase{}, fmt.Errorf("expected 1 embedding, got %d", len(embeddings))
	}

	// Persist to database.
	kb, err := s.repo.Create(ctx, req, embeddings[0])
	if err != nil {
		return KnowledgeBase{}, fmt.Errorf("create knowledge base entry: %w", err)
	}

	return kb, nil
}

// ProcessTrigger processes a trigger-based embedding request (standings, match result, jornada).
func (s *Service) ProcessTrigger(ctx context.Context, caller auth.Principal, req TriggerEmbeddingRequest) (KnowledgeBase, error) {
	// Check league permission
	if err := s.authz.CanManageLeague(ctx, caller, req.LeagueID); err != nil {
		return KnowledgeBase{}, err
	}

	// Validate that tournament belongs to league
	if err := s.repo.ValidateTournamentBelongsToLeague(ctx, req.LeagueID, req.TournamentID); err != nil {
		return KnowledgeBase{}, err
	}

	// If match_result_update, validate match belongs to tournament
	if req.TriggerType == "match_result_update" {
		if req.MatchID == nil || *req.MatchID == uuid.Nil {
			return KnowledgeBase{}, httpx.ErrBadRequest
		}
		if err := s.repo.ValidateMatchBelongsToTournament(ctx, *req.MatchID, req.TournamentID); err != nil {
			return KnowledgeBase{}, err
		}
	}

	var contentText string
	var knowledgeID uuid.UUID
	var processErr error

	// Generate content based on trigger type
	switch req.TriggerType {
	case "standings_update":
		knowledgeID, contentText, processErr = s.repo.GenerateStandingsContent(ctx, req.LeagueID, req.TournamentID)
		if processErr != nil {
			return KnowledgeBase{}, fmt.Errorf("generate standings content: %w", processErr)
		}

	case "match_result_update":
		// Call SQL function to generate content
		knowledgeID, contentText, processErr = s.repo.GenerateMatchResultContent(ctx, *req.MatchID)
		if processErr != nil {
			return KnowledgeBase{}, fmt.Errorf("generate match result content: %w", processErr)
		}

	case "jornada_update":
		// Call SQL function to generate content
		knowledgeID, contentText, processErr = s.repo.GenerateJornadaContent(ctx, req.LeagueID, req.TournamentID, *req.Round)
		if processErr != nil {
			return KnowledgeBase{}, fmt.Errorf("generate jornada content: %w", processErr)
		}
	}

	// Generate embedding for the content
	embeddings, err := s.emb.Embed(ctx, []string{contentText})
	if err != nil {
		return KnowledgeBase{}, fmt.Errorf("generate embedding: %w", err)
	}

	if len(embeddings) != 1 {
		return KnowledgeBase{}, fmt.Errorf("expected 1 embedding, got %d", len(embeddings))
	}

	// Update the knowledge entry with the embedding
	if err := s.repo.UpdateEmbedding(ctx, knowledgeID, embeddings[0]); err != nil {
		return KnowledgeBase{}, fmt.Errorf("update embedding: %w", err)
	}

	// Return the knowledge base entry (note: embedding not included in response)
	return KnowledgeBase{
		ID:       knowledgeID,
		LeagueID: req.LeagueID,
	}, nil
}
