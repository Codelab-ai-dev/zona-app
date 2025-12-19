-- Script para recalcular TODAS las estadísticas de team_stats desde los partidos
-- Ejecutar en Supabase SQL Editor cuando las estadísticas no coincidan

-- 1. Limpiar la tabla team_stats
TRUNCATE TABLE team_stats;

-- 2. Repoblar desde todos los partidos finalizados
DO $$
DECLARE
    match_record RECORD;
    processed_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Iniciando recálculo de estadísticas...';

    -- Procesar cada partido finalizado
    FOR match_record IN
        SELECT
            m.*,
            ht.league_id as home_league_id,
            at.league_id as away_league_id
        FROM matches m
        JOIN teams ht ON m.home_team_id = ht.id
        JOIN teams at ON m.away_team_id = at.id
        WHERE m.status = 'finished'
        AND m.home_score IS NOT NULL
        AND m.away_score IS NOT NULL
        ORDER BY m.match_date ASC
    LOOP
        processed_count := processed_count + 1;

        -- Estadísticas equipo LOCAL
        INSERT INTO team_stats (
            team_id, tournament_id, league_id,
            matches_played, matches_won, matches_drawn, matches_lost,
            goals_for, goals_against, clean_sheets,
            biggest_win_margin, biggest_loss_margin,
            last_match_date, last_win_date
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
            GREATEST(0, match_record.home_score - match_record.away_score),
            GREATEST(0, match_record.away_score - match_record.home_score),
            match_record.match_date,
            CASE WHEN match_record.home_score > match_record.away_score THEN match_record.match_date ELSE NULL END
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
            biggest_win_margin = GREATEST(team_stats.biggest_win_margin, GREATEST(0, match_record.home_score - match_record.away_score)),
            biggest_loss_margin = GREATEST(team_stats.biggest_loss_margin, GREATEST(0, match_record.away_score - match_record.home_score)),
            last_match_date = GREATEST(team_stats.last_match_date, match_record.match_date),
            last_win_date = CASE
                WHEN match_record.home_score > match_record.away_score THEN GREATEST(COALESCE(team_stats.last_win_date, match_record.match_date), match_record.match_date)
                ELSE team_stats.last_win_date
            END,
            updated_at = NOW();

        -- Estadísticas equipo VISITANTE
        INSERT INTO team_stats (
            team_id, tournament_id, league_id,
            matches_played, matches_won, matches_drawn, matches_lost,
            goals_for, goals_against, clean_sheets,
            biggest_win_margin, biggest_loss_margin,
            last_match_date, last_win_date
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
            GREATEST(0, match_record.away_score - match_record.home_score),
            GREATEST(0, match_record.home_score - match_record.away_score),
            match_record.match_date,
            CASE WHEN match_record.away_score > match_record.home_score THEN match_record.match_date ELSE NULL END
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
            biggest_win_margin = GREATEST(team_stats.biggest_win_margin, GREATEST(0, match_record.away_score - match_record.home_score)),
            biggest_loss_margin = GREATEST(team_stats.biggest_loss_margin, GREATEST(0, match_record.home_score - match_record.away_score)),
            last_match_date = GREATEST(team_stats.last_match_date, match_record.match_date),
            last_win_date = CASE
                WHEN match_record.away_score > match_record.home_score THEN GREATEST(COALESCE(team_stats.last_win_date, match_record.match_date), match_record.match_date)
                ELSE team_stats.last_win_date
            END,
            updated_at = NOW();

    END LOOP;

    RAISE NOTICE 'Procesados % partidos', processed_count;
END $$;

-- 3. Mostrar resultado
SELECT
    t.name as equipo,
    ts.matches_played as PJ,
    ts.matches_won as PG,
    ts.matches_drawn as PE,
    ts.matches_lost as PP,
    ts.goals_for as GF,
    ts.goals_against as GC,
    ts.goal_difference as DIF,
    ts.points as PTS
FROM team_stats ts
JOIN teams t ON ts.team_id = t.id
ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC;
