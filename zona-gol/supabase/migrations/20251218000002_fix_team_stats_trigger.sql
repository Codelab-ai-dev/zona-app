-- Fix: Agregar SECURITY DEFINER al trigger de team_stats
-- Esto permite que el trigger se ejecute con permisos elevados
-- y pueda insertar en team_stats independientemente del usuario

-- Recrear la función con SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_team_stats_after_match()
RETURNS TRIGGER
SECURITY DEFINER  -- IMPORTANTE: Ejecutar con permisos del creador
SET search_path = public
AS $$
BEGIN
  -- Solo procesar si el partido cambia a 'finished'
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN

    -- Actualizar estadísticas del equipo LOCAL
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
      last_win_date
    )
    SELECT
      NEW.home_team_id,
      NEW.tournament_id,
      t.league_id,
      1,
      CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
      COALESCE(NEW.home_score, 0),
      COALESCE(NEW.away_score, 0),
      CASE WHEN COALESCE(NEW.away_score, 0) = 0 THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score > NEW.away_score THEN NEW.home_score - NEW.away_score ELSE 0 END,
      CASE WHEN NEW.home_score < NEW.away_score THEN NEW.away_score - NEW.home_score ELSE 0 END,
      NEW.match_date,
      CASE WHEN NEW.home_score > NEW.away_score THEN NEW.match_date ELSE NULL END
    FROM teams t
    WHERE t.id = NEW.home_team_id
    ON CONFLICT (team_id, tournament_id)
    DO UPDATE SET
      matches_played = team_stats.matches_played + 1,
      matches_won = team_stats.matches_won + CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
      matches_drawn = team_stats.matches_drawn + CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END,
      matches_lost = team_stats.matches_lost + CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
      goals_for = team_stats.goals_for + COALESCE(NEW.home_score, 0),
      goals_against = team_stats.goals_against + COALESCE(NEW.away_score, 0),
      clean_sheets = team_stats.clean_sheets + CASE WHEN COALESCE(NEW.away_score, 0) = 0 THEN 1 ELSE 0 END,
      biggest_win_margin = GREATEST(team_stats.biggest_win_margin,
        CASE WHEN NEW.home_score > NEW.away_score THEN NEW.home_score - NEW.away_score ELSE 0 END),
      biggest_loss_margin = GREATEST(team_stats.biggest_loss_margin,
        CASE WHEN NEW.home_score < NEW.away_score THEN NEW.away_score - NEW.home_score ELSE 0 END),
      last_match_date = NEW.match_date,
      last_win_date = CASE
        WHEN NEW.home_score > NEW.away_score THEN NEW.match_date
        ELSE team_stats.last_win_date
      END,
      updated_at = NOW();

    -- Actualizar estadísticas del equipo VISITANTE
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
      last_win_date
    )
    SELECT
      NEW.away_team_id,
      NEW.tournament_id,
      t.league_id,
      1,
      CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
      COALESCE(NEW.away_score, 0),
      COALESCE(NEW.home_score, 0),
      CASE WHEN COALESCE(NEW.home_score, 0) = 0 THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score > NEW.home_score THEN NEW.away_score - NEW.home_score ELSE 0 END,
      CASE WHEN NEW.away_score < NEW.home_score THEN NEW.home_score - NEW.away_score ELSE 0 END,
      NEW.match_date,
      CASE WHEN NEW.away_score > NEW.home_score THEN NEW.match_date ELSE NULL END
    FROM teams t
    WHERE t.id = NEW.away_team_id
    ON CONFLICT (team_id, tournament_id)
    DO UPDATE SET
      matches_played = team_stats.matches_played + 1,
      matches_won = team_stats.matches_won + CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
      matches_drawn = team_stats.matches_drawn + CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END,
      matches_lost = team_stats.matches_lost + CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
      goals_for = team_stats.goals_for + COALESCE(NEW.away_score, 0),
      goals_against = team_stats.goals_against + COALESCE(NEW.home_score, 0),
      clean_sheets = team_stats.clean_sheets + CASE WHEN COALESCE(NEW.home_score, 0) = 0 THEN 1 ELSE 0 END,
      biggest_win_margin = GREATEST(team_stats.biggest_win_margin,
        CASE WHEN NEW.away_score > NEW.home_score THEN NEW.away_score - NEW.home_score ELSE 0 END),
      biggest_loss_margin = GREATEST(team_stats.biggest_loss_margin,
        CASE WHEN NEW.away_score < NEW.home_score THEN NEW.home_score - NEW.away_score ELSE 0 END),
      last_match_date = NEW.match_date,
      last_win_date = CASE
        WHEN NEW.away_score > NEW.home_score THEN NEW.match_date
        ELSE team_stats.last_win_date
      END,
      updated_at = NOW();

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asegurar que el trigger existe (si no existe, crearlo)
DROP TRIGGER IF EXISTS trigger_update_team_stats_after_match ON matches;
CREATE TRIGGER trigger_update_team_stats_after_match
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_team_stats_after_match();

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger actualizado con SECURITY DEFINER';
  RAISE NOTICE 'Ahora los nuevos resultados actualizarán team_stats automáticamente';
END $$;
