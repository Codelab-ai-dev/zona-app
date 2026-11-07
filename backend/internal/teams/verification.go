package teams

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Manual identity verification. The document image/PDF is uploaded to the
// private storage scope "player_document" (never public, presigned reads
// only); a league admin reviews it and marks the player as verified. No
// document data is sent to third parties.

// PlayerVerification is what managers see about a player's verification.
type PlayerVerification struct {
	PlayerID    uuid.UUID  `json:"player_id"`
	Verified    bool       `json:"id_verified"`
	VerifiedAt  *time.Time `json:"id_verified_at,omitempty"`
	VerifiedBy  *uuid.UUID `json:"id_verified_by,omitempty"`
	Method      *string    `json:"id_verification_method,omitempty"`
	DocumentKey *string    `json:"document_key,omitempty"`
}

// VerifyPlayerRequest is the body of PATCH /players/{playerID}/verification.
type VerifyPlayerRequest struct {
	Verified    bool    `json:"verified"`
	DocumentKey *string `json:"document_key,omitempty"`
}

var documentKeyRegex = regexp.MustCompile(`^player_document/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$`)

// Validate implements httpx.Validator.
func (r VerifyPlayerRequest) Validate() map[string]string {
	if r.DocumentKey != nil && !documentKeyRegex.MatchString(*r.DocumentKey) {
		return map[string]string{"document_key": "debe ser una clave de documento subida con scope player_document"}
	}
	if r.Verified && r.DocumentKey == nil {
		return map[string]string{"document_key": "para verificar se requiere el documento revisado"}
	}
	return nil
}

// verificationRepository is the persistence the verification flow needs.
type verificationRepository interface {
	GetPlayerVerification(ctx context.Context, playerID uuid.UUID) (PlayerVerification, error)
	SetPlayerVerification(ctx context.Context, playerID uuid.UUID, req VerifyPlayerRequest, by uuid.UUID) (PlayerVerification, error)
}

// GetPlayerVerification returns the verification status to whoever manages
// the player (team owner, league admin, super admin).
func (s *Service) GetPlayerVerification(ctx context.Context, caller auth.Principal, playerID uuid.UUID) (PlayerVerification, error) {
	if err := s.authz.CanManagePlayer(ctx, caller, playerID); err != nil {
		return PlayerVerification{}, err
	}
	return s.repo.GetPlayerVerification(ctx, playerID)
}

// VerifyPlayer records the league admin's decision. Team owners can upload
// the document but cannot verify their own players.
func (s *Service) VerifyPlayer(ctx context.Context, caller auth.Principal, playerID uuid.UUID, req VerifyPlayerRequest) (PlayerVerification, error) {
	player, err := s.repo.GetPlayerByID(ctx, playerID)
	if err != nil {
		return PlayerVerification{}, err
	}
	team, err := s.repo.GetTeamByID(ctx, player.TeamID)
	if err != nil {
		return PlayerVerification{}, err
	}
	if err := s.authz.CanManageLeague(ctx, caller, team.LeagueID); err != nil {
		return PlayerVerification{}, err
	}
	if req.DocumentKey != nil {
		// The document must belong to this player, not to another one.
		if m := documentKeyRegex.FindStringSubmatch(*req.DocumentKey); m == nil || m[1] != playerID.String() {
			return PlayerVerification{}, httpx.Validation(map[string]string{"document_key": "el documento no pertenece a este jugador"})
		}
	}
	return s.repo.SetPlayerVerification(ctx, playerID, req, caller.UserID)
}

// GetPlayerVerification implements verificationRepository.
func (r *PGRepository) GetPlayerVerification(ctx context.Context, playerID uuid.UUID) (PlayerVerification, error) {
	return r.scanVerification(r.db.QueryRow(ctx, `
		SELECT id, COALESCE(id_verified, false), id_verified_at, id_verified_by, id_verification_method, id_document_url
		FROM public.players WHERE id = $1`, playerID))
}

// SetPlayerVerification implements verificationRepository. Un-verifying
// clears who/when/how; the document key is kept unless a new one is given.
func (r *PGRepository) SetPlayerVerification(ctx context.Context, playerID uuid.UUID, req VerifyPlayerRequest, by uuid.UUID) (PlayerVerification, error) {
	return r.scanVerification(r.db.QueryRow(ctx, `
		UPDATE public.players SET
			id_verified = $2,
			id_verified_at = CASE WHEN $2 THEN now() END,
			id_verified_by = CASE WHEN $2 THEN $4::uuid END,
			id_verification_method = CASE WHEN $2 THEN 'manual' END,
			id_document_url = COALESCE($3, id_document_url),
			updated_at = now()
		WHERE id = $1
		RETURNING id, id_verified, id_verified_at, id_verified_by, id_verification_method, id_document_url`,
		playerID, req.Verified, req.DocumentKey, by))
}

func (r *PGRepository) scanVerification(row interface{ Scan(...any) error }) (PlayerVerification, error) {
	var v PlayerVerification
	err := row.Scan(&v.PlayerID, &v.Verified, &v.VerifiedAt, &v.VerifiedBy, &v.Method, &v.DocumentKey)
	if database.IsNoRows(err) {
		return PlayerVerification{}, httpx.ErrNotFound
	}
	if err != nil {
		return PlayerVerification{}, fmt.Errorf("player verification: %w", err)
	}
	return v, nil
}

func (h *Handler) getPlayerVerification(w http.ResponseWriter, r *http.Request) {
	playerID, err := httpx.UUIDParam(r, "playerID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	caller, _ := auth.FromContext(r.Context())
	v, err := h.svc.GetPlayerVerification(r.Context(), caller, playerID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, v)
}

func (h *Handler) verifyPlayer(w http.ResponseWriter, r *http.Request) {
	playerID, err := httpx.UUIDParam(r, "playerID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req VerifyPlayerRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	caller, _ := auth.FromContext(r.Context())
	v, err := h.svc.VerifyPlayer(r.Context(), caller, playerID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, v)
}
