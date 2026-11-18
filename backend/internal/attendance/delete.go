package attendance

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// DeleteAttendanceRequest is the body of DELETE /matches/{matchID}/attendance/{playerID}.
type DeleteAttendanceRequest struct {
	Reason string `json:"reason"`
}

// Validate requires a reason, kept in the audit log.
func (r DeleteAttendanceRequest) Validate() map[string]string {
	errs := map[string]string{}
	if n := len([]rune(strings.TrimSpace(r.Reason))); n < 5 || n > 500 {
		errs["reason"] = "explica el motivo (entre 5 y 500 caracteres)"
	}
	return errs
}

// DeleteAttendanceResult counts the records removed.
type DeleteAttendanceResult struct {
	QRRemoved     int `json:"qr_removed"`
	FacialRemoved int `json:"facial_removed"`
}

var errAttendanceMatchFinished = &httpx.Error{
	Status:  http.StatusConflict,
	Code:    httpx.ErrConflict.Code,
	Message: "El partido ya finalizó: para corregir su asistencia, reábrelo primero.",
}

var errNoAttendance = &httpx.Error{
	Status:  http.StatusNotFound,
	Code:    httpx.ErrNotFound.Code,
	Message: "Ese jugador no tiene asistencia registrada en este partido.",
}

// DeleteAttendance removes a player's QR and facial attendance from a match
// that is not finished, with a reason kept in match_audit_log (#53).
func (s *Service) DeleteAttendance(ctx context.Context, caller auth.Principal, matchID, playerID uuid.UUID, req DeleteAttendanceRequest) (DeleteAttendanceResult, error) {
	if errs := req.Validate(); len(errs) > 0 {
		return DeleteAttendanceResult{}, httpx.Validation(errs)
	}
	if err := s.authz.CanManageMatch(ctx, caller, matchID); err != nil {
		return DeleteAttendanceResult{}, err
	}
	return s.repo.DeleteAttendance(ctx, matchID, playerID, caller.UserID, strings.TrimSpace(req.Reason))
}

// DeleteAttendance implements Repository in one statement, so it is atomic
// without a transaction: it locks the match, refuses finished matches,
// deletes the records, drops the "played" row the QR trigger added to
// player_stats and writes the audit entry. Photos, device and location data
// are left out of the audit details.
func (r *PGRepository) DeleteAttendance(ctx context.Context, matchID, playerID, actorID uuid.UUID, reason string) (DeleteAttendanceResult, error) {
	const q = `
		WITH m AS (
			SELECT m.id, m.status, t.league_id
			FROM public.matches m JOIN public.tournaments t ON t.id = m.tournament_id
			WHERE m.id = $1
			FOR UPDATE OF m
		), ok AS (
			SELECT * FROM m WHERE status <> 'finished'
		), qr AS (
			DELETE FROM public.asistencias_qr a USING ok
			WHERE a.match_id = ok.id AND a.player_id = $2
			RETURNING jsonb_build_object('id', a.id, 'recognition_mode', a.recognition_mode,
				'local_timestamp', a.local_timestamp, 'operator_id', a.operator_id) AS rec
		), fa AS (
			DELETE FROM public.facial_attendance f USING ok
			WHERE f.match_id = ok.id AND f.player_id = $2
			RETURNING jsonb_build_object('id', f.id, 'recognition_mode', f.recognition_mode,
				'confidence_score', f.confidence_score, 'local_timestamp', f.local_timestamp, 'operator_id', f.operator_id) AS rec
		), removed AS (
			SELECT (SELECT count(*) FROM qr) AS qr, (SELECT count(*) FROM fa) AS fa
		), stats AS (
			DELETE FROM public.player_stats ps USING ok, removed
			WHERE ps.match_id = ok.id AND ps.player_id = $2 AND removed.qr + removed.fa > 0
			  AND ps.goals = 0 AND ps.assists = 0 AND ps.yellow_cards = 0 AND ps.red_cards = 0
			RETURNING 1
		), audit AS (
			INSERT INTO public.match_audit_log (match_id, league_id, action, reason, actor_id, details)
			SELECT ok.id, ok.league_id, 'delete_attendance', $3, $4, jsonb_build_object(
				'player_id', $2::uuid,
				'qr', COALESCE((SELECT jsonb_agg(rec) FROM qr), '[]'),
				'facial', COALESCE((SELECT jsonb_agg(rec) FROM fa), '[]'))
			FROM ok, removed WHERE removed.qr + removed.fa > 0
			RETURNING 1
		)
		SELECT (SELECT status FROM m), removed.qr, removed.fa, (SELECT count(*) FROM stats), (SELECT count(*) FROM audit)
		FROM removed`

	var status *string
	var res DeleteAttendanceResult
	var statsRemoved, audited int
	err := r.db.QueryRow(ctx, q, matchID, playerID, reason, actorID).Scan(&status, &res.QRRemoved, &res.FacialRemoved, &statsRemoved, &audited)
	if err != nil {
		return DeleteAttendanceResult{}, fmt.Errorf("delete attendance: %w", err)
	}
	switch {
	case status == nil:
		return DeleteAttendanceResult{}, httpx.ErrNotFound
	case *status == "finished":
		return DeleteAttendanceResult{}, errAttendanceMatchFinished
	case res.QRRemoved+res.FacialRemoved == 0:
		return DeleteAttendanceResult{}, errNoAttendance
	}
	return res, nil
}

// deleteAttendance handles DELETE /matches/{matchID}/attendance/{playerID}.
func (h *Handler) deleteAttendance(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	playerID, err := httpx.UUIDParam(r, "playerID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req DeleteAttendanceRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	res, err := h.svc.DeleteAttendance(r.Context(), caller, matchID, playerID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}
