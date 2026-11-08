package directory

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// PGRepository implements Repository with PostgreSQL.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository builds the directory repository.
func NewPGRepository(db database.Querier) *PGRepository {
	return &PGRepository{db: db}
}

// ListUsers returns all users (admin only), optionally filtered.
func (r *PGRepository) ListUsers(ctx context.Context, role *string, leagueID *uuid.UUID, search string, limit, offset int) ([]User, error) {
	q := `
		SELECT id, name, email, phone, role, league_id, team_id, is_active, created_at
		FROM public.users
		WHERE 1=1
	`
	args := []any{}
	argNum := 1

	if role != nil {
		q += fmt.Sprintf(` AND role = $%d`, argNum)
		args = append(args, *role)
		argNum++
	}
	if leagueID != nil {
		q += fmt.Sprintf(` AND league_id = $%d`, argNum)
		args = append(args, *leagueID)
		argNum++
	}
	if search != "" {
		// Escape % and _ for ILIKE
		search = escapeILike(search)
		q += fmt.Sprintf(` AND (name ILIKE $%d OR email ILIKE $%d)`, argNum, argNum+1)
		args = append(args, "%"+search+"%", "%"+search+"%")
		argNum += 2
	}

	q += fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, argNum, argNum+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Role, &u.LeagueID, &u.TeamID, &u.IsActive, &u.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}

	return users, rows.Err()
}

// ListLeagueUsers returns users that belong to a league.
func (r *PGRepository) ListLeagueUsers(ctx context.Context, leagueID uuid.UUID, search string, limit, offset int) ([]User, error) {
	q := `
		SELECT id, name, email, phone, role, league_id, team_id, is_active, created_at
		FROM public.users
		WHERE league_id = $1
	`
	args := []any{leagueID}

	if search != "" {
		search = escapeILike(search)
		q += ` AND (name ILIKE $2 OR email ILIKE $3)`
		args = append(args, "%"+search+"%", "%"+search+"%")
	}

	q += ` ORDER BY created_at DESC LIMIT $`
	q += fmt.Sprintf("%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("list league users: %w", err)
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Role, &u.LeagueID, &u.TeamID, &u.IsActive, &u.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}

	return users, rows.Err()
}

// ListWhatsAppLinks returns WhatsApp links for a league.
func (r *PGRepository) ListWhatsAppLinks(ctx context.Context, leagueID uuid.UUID, limit, offset int) ([]WhatsAppLink, error) {
	q := `
		SELECT id, phone_number, user_id, league_id, tournament_id, role, is_active,
			linked_at, last_interaction_at, display_name, preferred_language, created_at, updated_at
		FROM public.whatsapp_user_links
		WHERE league_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, q, leagueID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list whatsapp links: %w", err)
	}
	defer rows.Close()

	var links []WhatsAppLink
	for rows.Next() {
		var l WhatsAppLink
		if err := rows.Scan(&l.ID, &l.PhoneNumber, &l.UserID, &l.LeagueID, &l.TournamentID, &l.Role,
			&l.IsActive, &l.LinkedAt, &l.LastInteractionAt, &l.DisplayName, &l.PreferredLanguage, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan whatsapp link: %w", err)
		}
		links = append(links, l)
	}

	return links, rows.Err()
}

// CreateWhatsAppLink inserts a new WhatsApp link.
func (r *PGRepository) CreateWhatsAppLink(ctx context.Context, leagueID uuid.UUID, req *CreateWhatsAppLinkRequest) (WhatsAppLink, error) {
	q := `
		INSERT INTO public.whatsapp_user_links (
			phone_number, user_id, league_id, role, display_name, preferred_language, tournament_id, is_active
		)
		SELECT $1, $2, $3, $4, $5, $6, $7, true
		WHERE $7::uuid IS NULL OR EXISTS (SELECT 1 FROM public.tournaments WHERE id = $7 AND league_id = $3)
		RETURNING id, phone_number, user_id, league_id, tournament_id, role, is_active,
			linked_at, last_interaction_at, display_name, preferred_language, created_at, updated_at
	`

	var link WhatsAppLink
	err := r.db.QueryRow(ctx, q,
		req.PhoneNumber, req.UserID, leagueID, req.Role, req.DisplayName, req.PreferredLanguage, req.TournamentID,
	).Scan(&link.ID, &link.PhoneNumber, &link.UserID, &link.LeagueID, &link.TournamentID, &link.Role,
		&link.IsActive, &link.LinkedAt, &link.LastInteractionAt, &link.DisplayName, &link.PreferredLanguage, &link.CreatedAt, &link.UpdatedAt)

	if database.IsNoRows(err) {
		return WhatsAppLink{}, errTournamentNotInLeague
	}
	if err != nil {
		if isUniqueViolation(err) {
			return WhatsAppLink{}, httpx.ErrConflict.Wrap(err)
		}
		return WhatsAppLink{}, fmt.Errorf("create whatsapp link: %w", err)
	}

	return link, nil
}

// GetWhatsAppLink fetches a single WhatsApp link.
func (r *PGRepository) GetWhatsAppLink(ctx context.Context, linkID uuid.UUID) (WhatsAppLink, error) {
	q := `
		SELECT id, phone_number, user_id, league_id, tournament_id, role, is_active,
			linked_at, last_interaction_at, display_name, preferred_language, created_at, updated_at
		FROM public.whatsapp_user_links
		WHERE id = $1
	`

	var link WhatsAppLink
	err := r.db.QueryRow(ctx, q, linkID).Scan(&link.ID, &link.PhoneNumber, &link.UserID, &link.LeagueID, &link.TournamentID, &link.Role,
		&link.IsActive, &link.LinkedAt, &link.LastInteractionAt, &link.DisplayName, &link.PreferredLanguage, &link.CreatedAt, &link.UpdatedAt)

	if database.IsNoRows(err) {
		return WhatsAppLink{}, httpx.ErrNotFound
	}
	if err != nil {
		return WhatsAppLink{}, fmt.Errorf("get whatsapp link: %w", err)
	}

	return link, nil
}

// UpdateWhatsAppLink updates a WhatsApp link.
func (r *PGRepository) UpdateWhatsAppLink(ctx context.Context, linkID uuid.UUID, req *UpdateWhatsAppLinkRequest) (WhatsAppLink, error) {
	// Build dynamic UPDATE query
	q := `UPDATE public.whatsapp_user_links SET updated_at = now()`
	args := []any{}
	argNum := 1

	if req.IsActive != nil {
		q += fmt.Sprintf(`, is_active = $%d`, argNum)
		args = append(args, *req.IsActive)
		argNum++
	}
	if req.DisplayName != nil {
		q += fmt.Sprintf(`, display_name = $%d`, argNum)
		args = append(args, *req.DisplayName)
		argNum++
	}
	if req.PreferredLanguage != nil {
		q += fmt.Sprintf(`, preferred_language = $%d`, argNum)
		args = append(args, *req.PreferredLanguage)
		argNum++
	}

	tournamentCheck := ""
	if req.TournamentID != nil {
		var tid *uuid.UUID
		if *req.TournamentID != uuid.Nil {
			tid = req.TournamentID
		}
		q += fmt.Sprintf(`, tournament_id = $%d`, argNum)
		tournamentCheck = fmt.Sprintf(` AND ($%d::uuid IS NULL OR EXISTS (SELECT 1 FROM public.tournaments t
			WHERE t.id = $%d AND t.league_id = whatsapp_user_links.league_id))`, argNum, argNum)
		args = append(args, tid)
		argNum++
	}

	q += fmt.Sprintf(` WHERE id = $%d`, argNum) + tournamentCheck
	args = append(args, linkID)

	q += ` RETURNING id, phone_number, user_id, league_id, tournament_id, role, is_active,
		linked_at, last_interaction_at, display_name, preferred_language, created_at, updated_at`

	var link WhatsAppLink
	err := r.db.QueryRow(ctx, q, args...).Scan(&link.ID, &link.PhoneNumber, &link.UserID, &link.LeagueID, &link.TournamentID, &link.Role,
		&link.IsActive, &link.LinkedAt, &link.LastInteractionAt, &link.DisplayName, &link.PreferredLanguage, &link.CreatedAt, &link.UpdatedAt)

	if database.IsNoRows(err) {
		if tournamentCheck != "" {
			// The service already checked the link exists: the tournament is
			// from another league.
			return WhatsAppLink{}, errTournamentNotInLeague
		}
		return WhatsAppLink{}, httpx.ErrNotFound
	}
	if err != nil {
		return WhatsAppLink{}, fmt.Errorf("update whatsapp link: %w", err)
	}

	return link, nil
}

// DeactivateWhatsAppLink sets a link inactive.
func (r *PGRepository) DeactivateWhatsAppLink(ctx context.Context, linkID uuid.UUID) (WhatsAppLink, error) {
	req := &UpdateWhatsAppLinkRequest{
		IsActive: func() *bool { v := false; return &v }(),
	}
	return r.UpdateWhatsAppLink(ctx, linkID, req)
}

// PhoneNumberExists checks if a phone number is already registered.
func (r *PGRepository) PhoneNumberExists(ctx context.Context, phoneNumber string) (bool, error) {
	q := `SELECT EXISTS(SELECT 1 FROM public.whatsapp_user_links WHERE phone_number = $1)`

	var exists bool
	err := r.db.QueryRow(ctx, q, phoneNumber).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check phone number exists: %w", err)
	}

	return exists, nil
}

// GetLeagueID fetches the league for a whatsapp link.
func (r *PGRepository) GetLeagueID(ctx context.Context, linkID uuid.UUID) (uuid.UUID, error) {
	q := `SELECT league_id FROM public.whatsapp_user_links WHERE id = $1`

	var leagueID uuid.UUID
	err := r.db.QueryRow(ctx, q, linkID).Scan(&leagueID)
	if database.IsNoRows(err) {
		return uuid.Nil, httpx.ErrNotFound
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("get league id: %w", err)
	}

	return leagueID, nil
}

// isUniqueViolation checks if an error is a unique constraint violation.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return true
	}
	return false
}

// escapeILike escapes special characters for ILIKE queries.
func escapeILike(s string) string {
	// Escape % and _
	var result string
	for _, c := range s {
		if c == '%' || c == '_' {
			result += "\\"
		}
		result += string(c)
	}
	return result
}
