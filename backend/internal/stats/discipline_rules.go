package stats

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// DisciplineRules are a tournament's automatic suspension rules (#82).
// A nil YellowAccumulationLimit means yellow cards never suspend.
type DisciplineRules struct {
	YellowAccumulationLimit   *int `json:"yellow_accumulation_limit"`
	YellowAccumulationMatches int  `json:"yellow_accumulation_matches"`
}

// Validate mirrors the column constraints.
func (r DisciplineRules) Validate() map[string]string {
	errs := map[string]string{}
	if r.YellowAccumulationLimit != nil && (*r.YellowAccumulationLimit < 2 || *r.YellowAccumulationLimit > 20) {
		errs["yellow_accumulation_limit"] = "entre 2 y 20 amarillas, o vacío para desactivarla"
	}
	if r.YellowAccumulationMatches < 1 || r.YellowAccumulationMatches > 10 {
		errs["yellow_accumulation_matches"] = "entre 1 y 10 partidos"
	}
	return errs
}

// GetDisciplineRules returns a tournament's rules to whoever manages it.
func (s *Service) GetDisciplineRules(ctx context.Context, caller auth.Principal, tournamentID uuid.UUID) (DisciplineRules, error) {
	if err := s.azChecker.CanManageTournament(ctx, caller, tournamentID); err != nil {
		return DisciplineRules{}, err
	}
	return s.repo.GetDisciplineRules(ctx, tournamentID)
}

// SetDisciplineRules changes them. They apply to results saved from now on:
// past matches are not re-evaluated.
func (s *Service) SetDisciplineRules(ctx context.Context, caller auth.Principal, tournamentID uuid.UUID, rules DisciplineRules) (DisciplineRules, error) {
	if errs := rules.Validate(); len(errs) > 0 {
		return DisciplineRules{}, httpx.Validation(errs)
	}
	if err := s.azChecker.CanManageTournament(ctx, caller, tournamentID); err != nil {
		return DisciplineRules{}, err
	}
	return s.repo.SetDisciplineRules(ctx, tournamentID, rules)
}

// GetDisciplineRules implements Repository.
func (r *PGRepository) GetDisciplineRules(ctx context.Context, tournamentID uuid.UUID) (DisciplineRules, error) {
	var d DisciplineRules
	err := r.db.QueryRow(ctx, `
		SELECT yellow_accumulation_limit, yellow_accumulation_matches FROM public.tournaments WHERE id = $1`,
		tournamentID).Scan(&d.YellowAccumulationLimit, &d.YellowAccumulationMatches)
	if database.IsNoRows(err) {
		return DisciplineRules{}, httpx.ErrNotFound
	}
	if err != nil {
		return DisciplineRules{}, fmt.Errorf("get discipline rules: %w", err)
	}
	return d, nil
}

// SetDisciplineRules implements Repository.
func (r *PGRepository) SetDisciplineRules(ctx context.Context, tournamentID uuid.UUID, d DisciplineRules) (DisciplineRules, error) {
	tag, err := r.db.Exec(ctx, `
		UPDATE public.tournaments SET yellow_accumulation_limit = $2, yellow_accumulation_matches = $3, updated_at = now()
		WHERE id = $1`, tournamentID, d.YellowAccumulationLimit, d.YellowAccumulationMatches)
	if err != nil {
		return DisciplineRules{}, fmt.Errorf("set discipline rules: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return DisciplineRules{}, httpx.ErrNotFound
	}
	return d, nil
}

func (h *Handler) getDisciplineRules(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	rules, err := h.svc.GetDisciplineRules(r.Context(), caller, tournamentID)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, rules)
}

func (h *Handler) setDisciplineRules(w http.ResponseWriter, r *http.Request) {
	caller, _ := auth.FromContext(r.Context())
	tournamentID, err := httpx.UUIDParam(r, "tournamentID")
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	var req DisciplineRules
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	rules, err := h.svc.SetDisciplineRules(r.Context(), caller, tournamentID, req)
	if err != nil {
		httpx.WriteError(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, rules)
}
