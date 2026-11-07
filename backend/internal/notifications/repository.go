package notifications

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// PGRepository implements Repository with PostgreSQL.
type PGRepository struct {
	db database.Querier
}

// NewPGRepository creates a database-backed repository.
func NewPGRepository(db database.Querier) *PGRepository {
	return &PGRepository{db: db}
}

// GetLeagueRecipients fetches all active WhatsApp users linked to a league.
func (r *PGRepository) GetLeagueRecipients(ctx context.Context, leagueID uuid.UUID) ([]Recipient, error) {
	rows, err := r.db.Query(ctx, `
		SELECT phone_number
		FROM public.whatsapp_user_links
		WHERE league_id = $1 AND is_active = true
		ORDER BY phone_number
	`, leagueID)
	if err != nil {
		return nil, fmt.Errorf("query recipients: %w", err)
	}
	defer rows.Close()

	var recipients []Recipient
	for rows.Next() {
		var phone string
		if err := rows.Scan(&phone); err != nil {
			return nil, fmt.Errorf("scan recipient: %w", err)
		}
		recipients = append(recipients, Recipient{PhoneNumber: phone})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recipients: %w", err)
	}

	return recipients, nil
}

// GetMatchRecipients fetches all active WhatsApp users linked to teams in the match.
func (r *PGRepository) GetMatchRecipients(ctx context.Context, matchID uuid.UUID) ([]Recipient, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT w.phone_number
		FROM public.matches m
		JOIN public.teams ht ON m.home_team_id = ht.id
		JOIN public.teams at ON m.away_team_id = at.id
		JOIN public.whatsapp_user_links w ON (w.league_id = ht.league_id OR w.league_id = at.league_id)
		WHERE m.id = $1 AND w.is_active = true
		ORDER BY w.phone_number
	`, matchID)
	if err != nil {
		return nil, fmt.Errorf("query match recipients: %w", err)
	}
	defer rows.Close()

	var recipients []Recipient
	for rows.Next() {
		var phone string
		if err := rows.Scan(&phone); err != nil {
			return nil, fmt.Errorf("scan match recipient: %w", err)
		}
		recipients = append(recipients, Recipient{PhoneNumber: phone})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate match recipients: %w", err)
	}

	return recipients, nil
}

// GetLeagueSlug fetches a league's slug.
func (r *PGRepository) GetLeagueSlug(ctx context.Context, leagueID uuid.UUID) (string, error) {
	var slug string
	err := r.db.QueryRow(ctx, `
		SELECT slug FROM public.leagues WHERE id = $1
	`, leagueID).Scan(&slug)
	if database.IsNoRows(err) {
		return "", httpx.ErrNotFound.Wrap(fmt.Errorf("league not found"))
	}
	if err != nil {
		return "", fmt.Errorf("query league slug: %w", err)
	}
	return slug, nil
}

// GetLeagueData fetches league, tournament, and matches for a jornada.
func (r *PGRepository) GetLeagueData(ctx context.Context, leagueID uuid.UUID, tournamentID uuid.UUID, round int) (LeagueData, error) {
	var leagueName, leagueSlug, tournamentName string

	// Get league and tournament names
	err := r.db.QueryRow(ctx, `
		SELECT l.name, l.slug, t.name
		FROM public.leagues l
		JOIN public.tournaments t ON t.league_id = l.id
		WHERE l.id = $1 AND t.id = $2
	`, leagueID, tournamentID).Scan(&leagueName, &leagueSlug, &tournamentName)
	if database.IsNoRows(err) {
		return LeagueData{}, httpx.ErrNotFound.Wrap(fmt.Errorf("league or tournament not found"))
	}
	if err != nil {
		return LeagueData{}, fmt.Errorf("query league data: %w", err)
	}

	// Get matches for this round
	rows, err := r.db.Query(ctx, `
		SELECT ht.name, at.name, to_char(m.match_time, 'HH24:MI')
		FROM public.matches m
		JOIN public.teams ht ON m.home_team_id = ht.id
		JOIN public.teams at ON m.away_team_id = at.id
		WHERE m.tournament_id = $1 AND m.round = $2
		ORDER BY m.match_date, m.match_time
	`, tournamentID, round)
	if err != nil {
		return LeagueData{}, fmt.Errorf("query matches: %w", err)
	}
	defer rows.Close()

	var matches []JornadaMatch
	for rows.Next() {
		var homeTeam, awayTeam string
		var matchTime *string
		if err := rows.Scan(&homeTeam, &awayTeam, &matchTime); err != nil {
			return LeagueData{}, fmt.Errorf("scan match: %w", err)
		}
		time := "Por definir"
		if matchTime != nil && *matchTime != "" {
			time = *matchTime
		}
		matches = append(matches, JornadaMatch{
			HomeTeam: homeTeam,
			AwayTeam: awayTeam,
			Time:     time,
		})
	}
	if err := rows.Err(); err != nil {
		return LeagueData{}, fmt.Errorf("iterate matches: %w", err)
	}

	return LeagueData{
		LeagueID:       leagueID,
		LeagueName:     leagueName,
		LeagueSlug:     leagueSlug,
		TournamentID:   tournamentID,
		TournamentName: tournamentName,
		Round:          round,
		Matches:        matches,
	}, nil
}

// GetMatchData fetches match result data.
func (r *PGRepository) GetMatchData(ctx context.Context, matchID uuid.UUID) (MatchData, error) {
	var leagueID, tournamentID uuid.UUID
	var leagueName, tournamentName, homeTeam, awayTeam string
	var homeScore, awayScore int
	var round *int

	err := r.db.QueryRow(ctx, `
		SELECT l.id, l.name, t.id, t.name, ht.name, at.name, COALESCE(m.home_score, 0), COALESCE(m.away_score, 0), m.round
		FROM public.matches m
		JOIN public.teams ht ON m.home_team_id = ht.id
		JOIN public.teams at ON m.away_team_id = at.id
		JOIN public.tournaments t ON m.tournament_id = t.id
		JOIN public.leagues l ON t.league_id = l.id
		WHERE m.id = $1
	`, matchID).Scan(&leagueID, &leagueName, &tournamentID, &tournamentName, &homeTeam, &awayTeam, &homeScore, &awayScore, &round)
	if database.IsNoRows(err) {
		return MatchData{}, httpx.ErrNotFound.Wrap(fmt.Errorf("match not found"))
	}
	if err != nil {
		return MatchData{}, fmt.Errorf("query match data: %w", err)
	}

	roundNum := 0
	if round != nil {
		roundNum = *round
	}

	return MatchData{
		LeagueID:       leagueID,
		LeagueName:     leagueName,
		TournamentName: tournamentName,
		Round:          roundNum,
		HomeTeam:       homeTeam,
		HomeScore:      homeScore,
		AwayTeam:       awayTeam,
		AwayScore:      awayScore,
	}, nil
}

// GetMatchLeague fetches the league_id for a match.
func (r *PGRepository) GetMatchLeague(ctx context.Context, matchID uuid.UUID) (uuid.UUID, error) {
	var leagueID uuid.UUID
	err := r.db.QueryRow(ctx, `
		SELECT t.league_id FROM public.matches m
		JOIN public.tournaments t ON m.tournament_id = t.id
		WHERE m.id = $1
	`, matchID).Scan(&leagueID)
	if database.IsNoRows(err) {
		return uuid.Nil, httpx.ErrNotFound.Wrap(fmt.Errorf("match not found"))
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("query match league: %w", err)
	}
	return leagueID, nil
}

// PhoneNumberExists checks if a phone number is registered.
func (r *PGRepository) PhoneNumberExists(ctx context.Context, phoneNumber string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM public.whatsapp_user_links WHERE phone_number = $1)
	`, phoneNumber).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check phone existence: %w", err)
	}
	return exists, nil
}
