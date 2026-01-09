  -- Allow extemporaneous goals in player_stats
  ALTER TABLE player_stats DROP CONSTRAINT IF EXISTS player_stats_player_id_match_id_key;
  ALTER TABLE player_stats ALTER COLUMN match_id DROP NOT NULL;

  DROP INDEX IF EXISTS idx_player_stats_unique_match;
  DROP INDEX IF EXISTS idx_player_stats_unique_extemporaneous;

  CREATE UNIQUE INDEX idx_player_stats_unique_match
  ON player_stats(player_id, match_id)
  WHERE match_id IS NOT NULL;

  CREATE UNIQUE INDEX idx_player_stats_unique_extemporaneous
  ON player_stats(player_id)
  WHERE match_id IS NULL;

  ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS is_extemporaneous BOOLEAN DEFAULT FALSE;

  -- Update the sync trigger to SKIP extemporaneous records
  CREATE OR REPLACE FUNCTION sync_player_stats_to_cedula()
  RETURNS TRIGGER AS $$
  DECLARE
      goal_minute INTEGER;
      card_minute INTEGER;
      goal_counter INTEGER;
      card_counter INTEGER;
  BEGIN
      -- SKIP extemporaneous records (match_id IS NULL)
      IF NEW.match_id IS NULL THEN
          RETURN NEW;
      END IF;

      IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
          NEW.goals != OLD.goals OR
          NEW.yellow_cards != OLD.yellow_cards OR
          NEW.red_cards != OLD.red_cards
      )) THEN
          DELETE FROM match_goals
          WHERE match_id = NEW.match_id AND player_id = NEW.player_id AND description LIKE '%Auto-sync%';

          DELETE FROM match_cards
          WHERE match_id = NEW.match_id AND player_id = NEW.player_id AND reason LIKE '%Auto-sync%';

          IF NEW.goals > 0 THEN
              goal_counter := 1;
              WHILE goal_counter <= NEW.goals LOOP
                  goal_minute := 15 + (goal_counter - 1) * 25;
                  INSERT INTO match_goals (match_id, player_id, team_id, minute, goal_type, description, created_at)
                  SELECT NEW.match_id, NEW.player_id, p.team_id, goal_minute, 'normal',
                      format('Gol de %s (#%s) - Auto-sync', p.name, COALESCE(p.jersey_number::text, '?')), NOW()
                  FROM players p WHERE p.id = NEW.player_id;
                  goal_counter := goal_counter + 1;
              END LOOP;
          END IF;

          IF NEW.yellow_cards > 0 THEN
              card_counter := 1;
              WHILE card_counter <= NEW.yellow_cards LOOP
                  card_minute := 30 + (card_counter - 1) * 20;
                  INSERT INTO match_cards (match_id, player_id, team_id, card_type, minute, reason, created_at)
                  SELECT NEW.match_id, NEW.player_id, p.team_id, 'yellow', card_minute,
                      format('Tarjeta amarilla para %s (#%s) - Auto-sync', p.name, COALESCE(p.jersey_number::text, '?')), NOW()
                  FROM players p WHERE p.id = NEW.player_id;
                  card_counter := card_counter + 1;
              END LOOP;
          END IF;

          IF NEW.red_cards > 0 THEN
              card_counter := 1;
              WHILE card_counter <= NEW.red_cards LOOP
                  card_minute := 60 + (card_counter - 1) * 15;
                  INSERT INTO match_cards (match_id, player_id, team_id, card_type, minute, reason, created_at)
                  SELECT NEW.match_id, NEW.player_id, p.team_id, 'red', card_minute,
                      format('Tarjeta roja para %s (#%s) - Auto-sync', p.name, COALESCE(p.jersey_number::text, '?')), NOW()
                  FROM players p WHERE p.id = NEW.player_id;
                  card_counter := card_counter + 1;
              END LOOP;
          END IF;
      END IF;

      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;