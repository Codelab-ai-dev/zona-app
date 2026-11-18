package matches

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// ReopenMatchRequest is the body of POST /matches/{matchID}/reopen.
type ReopenMatchRequest struct {
	Reason string `json:"reason"`
}

// Validate requires a reason, kept in the audit log.
func (r ReopenMatchRequest) Validate() map[string]string {
	errs := map[string]string{}
	if n := len([]rune(strings.TrimSpace(r.Reason))); n < 5 || n > 500 {
		errs["reason"] = "explica el motivo (entre 5 y 500 caracteres)"
	}
	return errs
}

// ReopenMatchResult says what reopening undid, so the admin can follow up
// (e.g. fines already paid are kept and must be handled in Finanzas).
type ReopenMatchResult struct {
	GoalsRemoved       int64 `json:"goals_removed"`
	CardsRemoved       int64 `json:"cards_removed"`
	IncidentsRemoved   int64 `json:"incidents_removed"`
	SuspensionsRemoved int64 `json:"suspensions_removed"`
	SuspensionsKept    int   `json:"suspensions_kept"`
	FinesCancelled     int64 `json:"fines_cancelled"`
	FinesKept          int   `json:"fines_kept"`
}

var errNotFinished = &httpx.Error{
	Status:  http.StatusConflict,
	Code:    httpx.ErrConflict.Code,
	Message: "Solo se puede reabrir un partido finalizado.",
}

// ReopenMatch takes a finished match back to scheduled 0-0, in one
// transaction (#53):
//   - deletes its goals, cards and incidents;
//   - deletes the automatic suspensions (red card, yellow accumulation) not
//     served yet (served ones stay);
//   - cancels its automatic fines nobody paid yet (paid ones stay);
//   - stops counting it for other players' suspensions (#81);
//   - rebuilds player stats and the tournament standings;
//   - records who, when, why and the previous result in match_audit_log.
//
// Attendance and the referee report are kept: they did happen.
func (s *Service) ReopenMatch(ctx context.Context, caller auth.Principal, matchID uuid.UUID, req ReopenMatchRequest) (ReopenMatchResult, error) {
	if errs := req.Validate(); len(errs) > 0 {
		return ReopenMatchResult{}, httpx.Validation(errs)
	}
	if err := s.authz.CanManageMatch(ctx, caller, matchID); err != nil {
		return ReopenMatchResult{}, err
	}
	reason := strings.TrimSpace(req.Reason)

	var res ReopenMatchResult
	err := database.WithUserTx(ctx, s.pool, caller.UserID, func(tx pgx.Tx) error {
		var status string
		var homeScore, awayScore *int
		var tournamentID, leagueID uuid.UUID
		err := tx.QueryRow(ctx, `
			SELECT m.status, m.home_score, m.away_score, m.tournament_id, t.league_id
			FROM public.matches m JOIN public.tournaments t ON t.id = m.tournament_id
			WHERE m.id = $1
			FOR UPDATE OF m`, matchID).Scan(&status, &homeScore, &awayScore, &tournamentID, &leagueID)
		if database.IsNoRows(err) {
			return httpx.ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("lock match: %w", err)
		}
		if status != string(MatchStatusFinished) {
			return errNotFinished
		}

		// The previous result, events included, goes to the audit log.
		var events json.RawMessage
		if err := tx.QueryRow(ctx, `
			SELECT jsonb_build_object(
				'goals', COALESCE((SELECT jsonb_agg(to_jsonb(g) - 'created_at' - 'updated_at') FROM public.match_goals g WHERE g.match_id = $1), '[]'),
				'cards', COALESCE((SELECT jsonb_agg(to_jsonb(c) - 'created_at' - 'updated_at') FROM public.match_cards c WHERE c.match_id = $1), '[]'),
				'incidents', COALESCE((SELECT jsonb_agg(to_jsonb(i) - 'created_at' - 'updated_at') FROM public.match_incidents i WHERE i.match_id = $1), '[]'))`,
			matchID).Scan(&events); err != nil {
			return fmt.Errorf("snapshot events: %w", err)
		}

		exec := func(what, q string, args ...any) (int64, error) {
			tag, err := tx.Exec(ctx, q, args...)
			if err != nil {
				return 0, fmt.Errorf("%s: %w", what, err)
			}
			return tag.RowsAffected(), nil
		}
		if err := tx.QueryRow(ctx, `
			SELECT count(*) FROM public.player_suspensions
			WHERE `+automaticSuspensionsOf+`
			  AND COALESCE(matches_served, 0) > 0`, matchID).Scan(&res.SuspensionsKept); err != nil {
			return fmt.Errorf("count served suspensions: %w", err)
		}
		if res.SuspensionsRemoved, err = exec("delete suspensions", `
			DELETE FROM public.player_suspensions
			WHERE `+automaticSuspensionsOf+`
			  AND COALESCE(matches_served, 0) = 0`, matchID); err != nil {
			return err
		}
		// The match no longer counts for other suspensions: the trigger gives
		// back the served match (and reactivates them if it completed them).
		if _, err := exec("undo suspension applications", `DELETE FROM public.suspension_match_applications WHERE match_id = $1`, matchID); err != nil {
			return err
		}
		if res.GoalsRemoved, err = exec("delete goals", `DELETE FROM public.match_goals WHERE match_id = $1`, matchID); err != nil {
			return err
		}
		if res.CardsRemoved, err = exec("delete cards", `DELETE FROM public.match_cards WHERE match_id = $1`, matchID); err != nil {
			return err
		}
		if res.IncidentsRemoved, err = exec("delete incidents", `DELETE FROM public.match_incidents WHERE match_id = $1`, matchID); err != nil {
			return err
		}
		if res.FinesCancelled, err = exec("cancel fines", `
			UPDATE public.finance_transactions
			SET status = 'cancelled', cancelled_by = $2, cancelled_at = now(), updated_by = $2, updated_at = now(),
			    cancellation_reason = 'Partido reabierto: ' || $3
			WHERE match_id = $1 AND auto_generated
			  AND status IN ('pending', 'overdue') AND COALESCE(amount_paid, 0) = 0`, matchID, caller.UserID, reason); err != nil {
			return err
		}
		if err := tx.QueryRow(ctx, `
			SELECT count(*) FROM public.finance_transactions
			WHERE match_id = $1 AND auto_generated AND status IN ('paid', 'partial', 'pending', 'overdue')`,
			matchID).Scan(&res.FinesKept); err != nil {
			return fmt.Errorf("count kept fines: %w", err)
		}
		if _, err := exec("reopen match", `
			UPDATE public.matches SET status = 'scheduled', home_score = 0, away_score = 0, updated_at = now()
			WHERE id = $1`, matchID); err != nil {
			return err
		}
		if _, err := exec("rebuild player stats", `SELECT public.rebuild_match_player_stats($1)`, matchID); err != nil {
			return err
		}
		if _, err := exec("rebuild standings", `SELECT public.rebuild_team_stats_for_tournament($1)`, tournamentID); err != nil {
			return err
		}

		details, err := json.Marshal(map[string]any{
			"previous": map[string]any{"home_score": homeScore, "away_score": awayScore, "events": events},
			"result":   res,
		})
		if err != nil {
			return fmt.Errorf("audit details: %w", err)
		}
		_, err = exec("audit", `
			INSERT INTO public.match_audit_log (match_id, league_id, action, reason, actor_id, details)
			VALUES ($1, $2, 'reopen_match', $3, $4, $5)`, matchID, leagueID, reason, caller.UserID, details)
		return err
	})
	if err != nil {
		return ReopenMatchResult{}, err
	}
	return res, nil
}

// reopenMatch handles POST /matches/{matchID}/reopen.
func (h *Handler) reopenMatch(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	matchID, err := httpx.UUIDParam(r, "matchID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req ReopenMatchRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	res, err := h.svc.ReopenMatch(r.Context(), caller, matchID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}
