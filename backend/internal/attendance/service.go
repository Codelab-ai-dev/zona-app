package attendance

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Service holds business rules for attendance.
type Service struct {
	repo  Repository
	authz authz.Checker
}

// NewService builds the attendance service.
func NewService(repo Repository, authz authz.Checker) *Service {
	return &Service{repo: repo, authz: authz}
}

// RecordQRAttendance records a QR scan attendance. Only league admins can record.
func (s *Service) RecordQRAttendance(ctx context.Context, caller auth.Principal, matchID uuid.UUID, req *RecordQRAttendanceRequest) (QRAttendance, error) {
	// Check authorization: league admin or super admin
	if err := s.authz.CanManageMatch(ctx, caller, matchID); err != nil {
		return QRAttendance{}, err
	}

	// Check match status (not finished)
	status, err := s.repo.GetMatchStatus(ctx, matchID)
	if err != nil {
		return QRAttendance{}, err
	}
	if status == "finished" || status == "cancelled" {
		return QRAttendance{}, httpx.ErrConflict.Wrap(fmt.Errorf("match is %s", status))
	}

	// Check player belongs to match
	inMatch, err := s.repo.CheckPlayerInMatch(ctx, req.PlayerID, matchID)
	if err != nil {
		return QRAttendance{}, err
	}
	if !inMatch {
		return QRAttendance{}, httpx.ErrBadRequest.Wrap(fmt.Errorf("player not in match"))
	}

	return s.repo.RecordQRAttendance(ctx, matchID, req)
}

// RecordFacialAttendance records facial recognition attendance. Only league admins can record.
func (s *Service) RecordFacialAttendance(ctx context.Context, caller auth.Principal, matchID uuid.UUID, req *RecordFacialAttendanceRequest) (FacialAttendance, error) {
	// Check authorization: league admin or super admin
	if err := s.authz.CanManageMatch(ctx, caller, matchID); err != nil {
		return FacialAttendance{}, err
	}

	// Check match status (not finished)
	status, err := s.repo.GetMatchStatus(ctx, matchID)
	if err != nil {
		return FacialAttendance{}, err
	}
	if status == "finished" || status == "cancelled" {
		return FacialAttendance{}, httpx.ErrConflict.Wrap(fmt.Errorf("match is %s", status))
	}

	// Check player belongs to match
	inMatch, err := s.repo.CheckPlayerInMatch(ctx, req.PlayerID, matchID)
	if err != nil {
		return FacialAttendance{}, err
	}
	if !inMatch {
		return FacialAttendance{}, httpx.ErrBadRequest.Wrap(fmt.Errorf("player not in match"))
	}

	return s.repo.RecordFacialAttendance(ctx, matchID, req)
}

// ListAttendance lists attendance for a match. Readable per RLS (league users can read).
func (s *Service) ListAttendance(ctx context.Context, matchID uuid.UUID, limit, offset int) ([]AttendanceRecord, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	records, err := s.repo.ListAttendance(ctx, matchID, limit, offset)
	if err != nil {
		return nil, err
	}

	return records, nil
}

// StreamAttendance streams attendance updates for a match via SSE.
func (s *Service) StreamAttendance(ctx context.Context, matchID uuid.UUID, ch chan AttendanceRecord) error {
	return s.repo.StreamAttendance(ctx, matchID, ch)
}

// PlayerMatchesOn lists the matches a scanned player can check in to on a
// date (the scanning device's local date). League admins only.
func (s *Service) PlayerMatchesOn(ctx context.Context, caller auth.Principal, playerID uuid.UUID, date time.Time) ([]TodayMatch, error) {
	leagueID, err := s.repo.PlayerLeague(ctx, playerID)
	if err != nil {
		return nil, err
	}
	if err := s.authz.CanManageLeague(ctx, caller, leagueID); err != nil {
		return nil, err
	}
	return s.repo.PlayerMatchesOn(ctx, playerID, date)
}
