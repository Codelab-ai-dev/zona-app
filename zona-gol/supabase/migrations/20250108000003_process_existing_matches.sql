-- Process existing finished matches to populate team_stats table
-- Migration: 20250108000003_process_existing_matches.sql

-- This migration will find all existing finished matches and process them
-- to create the corresponding team statistics entries

DO $$ 
DECLARE
    match_record RECORD;
    home_team_record RECORD;
    away_team_record RECORD;
    existing_matches_count INTEGER;
BEGIN
    -- First, let's see how many finished matches we have
    SELECT COUNT(*) INTO existing_matches_count
    FROM matches 
    WHERE status = 'finished';
    
    RAISE NOTICE 'Found % finished matches to process', existing_matches_count;
    
    IF existing_matches_count = 0 THEN
        RAISE NOTICE 'No finished matches found. Nothing to process.';
        RETURN;
    END IF;
    
    -- Process each finished match
    FOR match_record IN 
        SELECT 
            m.*,
            ht.league_id as home_league_id,
            at.league_id as away_league_id
        FROM matches m
        JOIN teams ht ON m.home_team_id = ht.id
        JOIN teams at ON m.away_team_id = at.id
        WHERE m.status = 'finished'
        ORDER BY m.match_date ASC
    LOOP
        RAISE NOTICE 'Processing match: % vs % (% - %)', 
            match_record.home_team_id, match_record.away_team_id, 
            match_record.home_score, match_record.away_score;
            
        -- Process home team statistics
        INSERT INTO team_stats (
            team_id, 
            tournament_id, 
            league_id,
            matches_played,
            matches_won,
            matches_drawn,
            matches_lost,
            goals_for,
            goals_against,
            clean_sheets,
            biggest_win_margin,
            biggest_loss_margin,
            last_match_date,
            last_win_date,
            created_at,
            updated_at
        )
        VALUES (
            match_record.home_team_id,
            match_record.tournament_id,
            match_record.home_league_id,
            1,
            CASE WHEN match_record.home_score > match_record.away_score THEN 1 ELSE 0 END,
            CASE WHEN match_record.home_score = match_record.away_score THEN 1 ELSE 0 END,
            CASE WHEN match_record.home_score < match_record.away_score THEN 1 ELSE 0 END,
            match_record.home_score,
            match_record.away_score,
            CASE WHEN match_record.away_score = 0 THEN 1 ELSE 0 END,
            CASE WHEN match_record.home_score > match_record.away_score THEN match_record.home_score - match_record.away_score ELSE 0 END,
            CASE WHEN match_record.home_score < match_record.away_score THEN match_record.away_score - match_record.home_score ELSE 0 END,
            match_record.match_date,
            CASE WHEN match_record.home_score > match_record.away_score THEN match_record.match_date ELSE NULL END,
            match_record.created_at,
            NOW()
        )
        ON CONFLICT (team_id, tournament_id) 
        DO UPDATE SET
            matches_played = team_stats.matches_played + 1,
            matches_won = team_stats.matches_won + CASE WHEN match_record.home_score > match_record.away_score THEN 1 ELSE 0 END,
            matches_drawn = team_stats.matches_drawn + CASE WHEN match_record.home_score = match_record.away_score THEN 1 ELSE 0 END,
            matches_lost = team_stats.matches_lost + CASE WHEN match_record.home_score < match_record.away_score THEN 1 ELSE 0 END,
            goals_for = team_stats.goals_for + match_record.home_score,
            goals_against = team_stats.goals_against + match_record.away_score,
            clean_sheets = team_stats.clean_sheets + CASE WHEN match_record.away_score = 0 THEN 1 ELSE 0 END,
            biggest_win_margin = GREATEST(team_stats.biggest_win_margin, 
                CASE WHEN match_record.home_score > match_record.away_score THEN match_record.home_score - match_record.away_score ELSE 0 END),
            biggest_loss_margin = GREATEST(team_stats.biggest_loss_margin,
                CASE WHEN match_record.home_score < match_record.away_score THEN match_record.away_score - match_record.home_score ELSE 0 END),
            last_match_date = GREATEST(team_stats.last_match_date, match_record.match_date),
            last_win_date = CASE 
                WHEN match_record.home_score > match_record.away_score AND match_record.match_date > COALESCE(team_stats.last_win_date, '1900-01-01'::timestamp) 
                THEN match_record.match_date 
                ELSE team_stats.last_win_date 
            END,
            updated_at = NOW();

        -- Process away team statistics
        INSERT INTO team_stats (
            team_id, 
            tournament_id, 
            league_id,
            matches_played,
            matches_won,
            matches_drawn,
            matches_lost,
            goals_for,
            goals_against,
            clean_sheets,
            biggest_win_margin,
            biggest_loss_margin,
            last_match_date,
            last_win_date,
            created_at,
            updated_at
        )
        VALUES (
            match_record.away_team_id,
            match_record.tournament_id,
            match_record.away_league_id,
            1,
            CASE WHEN match_record.away_score > match_record.home_score THEN 1 ELSE 0 END,
            CASE WHEN match_record.away_score = match_record.home_score THEN 1 ELSE 0 END,
            CASE WHEN match_record.away_score < match_record.home_score THEN 1 ELSE 0 END,
            match_record.away_score,
            match_record.home_score,
            CASE WHEN match_record.home_score = 0 THEN 1 ELSE 0 END,
            CASE WHEN match_record.away_score > match_record.home_score THEN match_record.away_score - match_record.home_score ELSE 0 END,
            CASE WHEN match_record.away_score < match_record.home_score THEN match_record.home_score - match_record.away_score ELSE 0 END,
            match_record.match_date,
            CASE WHEN match_record.away_score > match_record.home_score THEN match_record.match_date ELSE NULL END,
            match_record.created_at,
            NOW()
        )
        ON CONFLICT (team_id, tournament_id) 
        DO UPDATE SET
            matches_played = team_stats.matches_played + 1,
            matches_won = team_stats.matches_won + CASE WHEN match_record.away_score > match_record.home_score THEN 1 ELSE 0 END,
            matches_drawn = team_stats.matches_drawn + CASE WHEN match_record.away_score = match_record.home_score THEN 1 ELSE 0 END,
            matches_lost = team_stats.matches_lost + CASE WHEN match_record.away_score < match_record.home_score THEN 1 ELSE 0 END,
            goals_for = team_stats.goals_for + match_record.away_score,
            goals_against = team_stats.goals_against + match_record.home_score,
            clean_sheets = team_stats.clean_sheets + CASE WHEN match_record.home_score = 0 THEN 1 ELSE 0 END,
            biggest_win_margin = GREATEST(team_stats.biggest_win_margin,
                CASE WHEN match_record.away_score > match_record.home_score THEN match_record.away_score - match_record.home_score ELSE 0 END),
            biggest_loss_margin = GREATEST(team_stats.biggest_loss_margin,
                CASE WHEN match_record.away_score < match_record.home_score THEN match_record.home_score - match_record.away_score ELSE 0 END),
            last_match_date = GREATEST(team_stats.last_match_date, match_record.match_date),
            last_win_date = CASE 
                WHEN match_record.away_score > match_record.home_score AND match_record.match_date > COALESCE(team_stats.last_win_date, '1900-01-01'::timestamp)
                THEN match_record.match_date 
                ELSE team_stats.last_win_date 
            END,
            updated_at = NOW();
            
    END LOOP;
    
    -- Now process player statistics (cards) for existing matches
    UPDATE team_stats 
    SET 
        yellow_cards = (
            SELECT COALESCE(SUM(ps.yellow_cards), 0)
            FROM player_stats ps
            JOIN players p ON ps.player_id = p.id
            JOIN matches m ON ps.match_id = m.id
            WHERE p.team_id = team_stats.team_id 
            AND m.tournament_id = team_stats.tournament_id
            AND m.status = 'finished'
        ),
        red_cards = (
            SELECT COALESCE(SUM(ps.red_cards), 0)
            FROM player_stats ps
            JOIN players p ON ps.player_id = p.id
            JOIN matches m ON ps.match_id = m.id
            WHERE p.team_id = team_stats.team_id 
            AND m.tournament_id = team_stats.tournament_id
            AND m.status = 'finished'
        ),
        updated_at = NOW();
    
    -- Process attendance statistics for existing matches
    UPDATE team_stats 
    SET 
        total_attendance = (
            SELECT COUNT(DISTINCT fa.player_id)
            FROM facial_attendance fa
            JOIN players p ON fa.player_id = p.id
            JOIN matches m ON fa.match_id = m.id
            WHERE p.team_id = team_stats.team_id 
            AND m.tournament_id = team_stats.tournament_id
            AND m.status = 'finished'
        ),
        average_attendance = (
            SELECT 
                CASE 
                    WHEN COUNT(DISTINCT m.id) > 0 THEN 
                        COUNT(DISTINCT fa.player_id)::DECIMAL / COUNT(DISTINCT m.id)
                    ELSE 0 
                END
            FROM matches m
            LEFT JOIN facial_attendance fa ON m.id = fa.match_id
            LEFT JOIN players p ON fa.player_id = p.id
            WHERE (m.home_team_id = team_stats.team_id OR m.away_team_id = team_stats.team_id)
            AND m.tournament_id = team_stats.tournament_id
            AND m.status = 'finished'
            AND (p.team_id = team_stats.team_id OR p.team_id IS NULL)
        ),
        updated_at = NOW();
    
    -- Calculate and update recent form (last 5 matches) using a different approach
    FOR match_record IN 
        SELECT DISTINCT ts.id as team_stats_id, ts.team_id, ts.tournament_id
        FROM team_stats ts
    LOOP
        UPDATE team_stats 
        SET 
            recent_form = (
                SELECT STRING_AGG(
                    result, 
                    '' ORDER BY match_date DESC
                )
                FROM (
                    SELECT 
                        CASE 
                            WHEN (m.home_team_id = match_record.team_id AND m.home_score > m.away_score) OR
                                 (m.away_team_id = match_record.team_id AND m.away_score > m.home_score) THEN 'W'
                            WHEN m.home_score = m.away_score THEN 'D'
                            ELSE 'L'
                        END as result,
                        m.match_date
                    FROM matches m
                    WHERE (m.home_team_id = match_record.team_id OR m.away_team_id = match_record.team_id)
                    AND m.tournament_id = match_record.tournament_id
                    AND m.status = 'finished'
                    ORDER BY m.match_date DESC
                    LIMIT 5
                ) recent_matches
            ),
            updated_at = NOW()
        WHERE id = match_record.team_stats_id;
    END LOOP;
    
    -- Get final count of processed team stats
    SELECT COUNT(*) INTO existing_matches_count FROM team_stats;
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Created team statistics entries for % teams', existing_matches_count;
    RAISE NOTICE 'All existing finished matches have been processed and team statistics updated.';
    
END $$;