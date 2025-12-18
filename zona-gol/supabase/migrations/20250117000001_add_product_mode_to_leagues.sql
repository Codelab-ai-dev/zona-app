-- ============================================================================
-- ADD PRODUCT MODE TO LEAGUES
-- Migration: 20250117000001_add_product_mode_to_leagues.sql
--
-- Purpose: Add product_mode column to differentiate between:
--   - 'full': Complete system with Flutter app, QR codes, facial recognition
--   - 'web_only': Web portal only with manual data entry
-- ============================================================================

-- ============================================================================
-- 1. ADD PRODUCT MODE COLUMN
-- ============================================================================

ALTER TABLE leagues
ADD COLUMN product_mode TEXT NOT NULL DEFAULT 'full'
CHECK (product_mode IN ('full', 'web_only'));

-- ============================================================================
-- 2. ADD FEATURES CONFIGURATION (JSONB for flexibility)
-- ============================================================================

ALTER TABLE leagues
ADD COLUMN features JSONB DEFAULT '{
  "qr_codes": true,
  "facial_recognition": true,
  "mobile_app": true,
  "realtime_updates": true,
  "manual_entry": true,
  "public_portal": true,
  "statistics": true,
  "ai_agent": true
}'::jsonb;

-- ============================================================================
-- 3. ADD MODE CHANGE TRACKING
-- ============================================================================

ALTER TABLE leagues
ADD COLUMN mode_updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE leagues
ADD COLUMN mode_updated_by UUID REFERENCES users(id);

-- ============================================================================
-- 4. CREATE FUNCTION TO SET DEFAULT FEATURES BY MODE
-- ============================================================================

CREATE OR REPLACE FUNCTION set_default_features_for_mode()
RETURNS TRIGGER AS $$
BEGIN
  -- Set features based on product_mode
  IF NEW.product_mode = 'web_only' THEN
    NEW.features := jsonb_build_object(
      'qr_codes', false,
      'facial_recognition', false,
      'mobile_app', false,
      'realtime_updates', false,
      'manual_entry', true,
      'public_portal', true,
      'statistics', true,
      'ai_agent', true
    );
  ELSIF NEW.product_mode = 'full' THEN
    NEW.features := jsonb_build_object(
      'qr_codes', true,
      'facial_recognition', true,
      'mobile_app', true,
      'realtime_updates', true,
      'manual_entry', true,
      'public_portal', true,
      'statistics', true,
      'ai_agent', true
    );
  END IF;

  -- Track mode changes
  IF TG_OP = 'UPDATE' AND OLD.product_mode IS DISTINCT FROM NEW.product_mode THEN
    NEW.mode_updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREATE TRIGGER FOR AUTO-SETTING FEATURES
-- ============================================================================

CREATE TRIGGER trigger_set_default_features
  BEFORE INSERT OR UPDATE OF product_mode ON leagues
  FOR EACH ROW
  EXECUTE FUNCTION set_default_features_for_mode();

-- ============================================================================
-- 6. UPDATE RLS POLICIES FOR ATTENDANCE TABLES
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on asistencias_qr" ON asistencias_qr;
DROP POLICY IF EXISTS "QR attendance only for full mode leagues" ON asistencias_qr;

-- Only allow QR attendance for 'full' mode leagues
CREATE POLICY "QR attendance only for full mode leagues"
ON asistencias_qr
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM leagues l
    JOIN tournaments t ON t.league_id = l.id
    JOIN matches m ON m.tournament_id = t.id
    WHERE m.id = asistencias_qr.match_id
    AND l.product_mode = 'full'
  )
);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Facial attendance only for full mode leagues" ON facial_attendance;

-- Only allow facial attendance for 'full' mode leagues (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'facial_attendance') THEN
    EXECUTE 'CREATE POLICY "Facial attendance only for full mode leagues"
      ON facial_attendance
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM leagues l
          JOIN tournaments t ON t.league_id = l.id
          JOIN matches m ON m.tournament_id = t.id
          WHERE m.id = facial_attendance.match_id
          AND l.product_mode = ''full''
        )
      )';
  END IF;
END $$;

-- ============================================================================
-- 7. CREATE VIEW FOR LEAGUE FEATURES
-- ============================================================================

CREATE OR REPLACE VIEW league_features_summary AS
SELECT
  l.id as league_id,
  l.name as league_name,
  l.product_mode,
  l.features,
  l.features->>'qr_codes' = 'true' as has_qr,
  l.features->>'facial_recognition' = 'true' as has_facial,
  l.features->>'mobile_app' = 'true' as has_mobile,
  l.features->>'realtime_updates' = 'true' as has_realtime,
  l.features->>'manual_entry' = 'true' as has_manual,
  l.features->>'public_portal' = 'true' as has_portal,
  l.features->>'statistics' = 'true' as has_stats,
  l.features->>'ai_agent' = 'true' as has_ai,
  l.mode_updated_at,
  l.mode_updated_by,
  u.email as mode_updated_by_email
FROM leagues l
LEFT JOIN users u ON l.mode_updated_by = u.id;

-- ============================================================================
-- 8. ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON COLUMN leagues.product_mode IS 'Product tier: full (app+QR+facial) or web_only (manual entry only)';
COMMENT ON COLUMN leagues.features IS 'JSONB configuration of enabled features for this league';
COMMENT ON COLUMN leagues.mode_updated_at IS 'Timestamp when product_mode was last changed';
COMMENT ON COLUMN leagues.mode_updated_by IS 'User who last changed the product_mode';

-- ============================================================================
-- 9. CREATE HELPER FUNCTION TO CHECK FEATURE AVAILABILITY
-- ============================================================================

CREATE OR REPLACE FUNCTION league_has_feature(
  p_league_id UUID,
  p_feature_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_feature BOOLEAN;
BEGIN
  SELECT (features->>p_feature_name)::BOOLEAN
  INTO v_has_feature
  FROM leagues
  WHERE id = p_league_id;

  RETURN COALESCE(v_has_feature, false);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION league_has_feature IS 'Check if a league has a specific feature enabled: league_has_feature(league_id, ''qr_codes'')';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Example queries:
-- SELECT * FROM league_features_summary;
-- SELECT league_has_feature('your-league-id', 'qr_codes');
-- UPDATE leagues SET product_mode = 'web_only' WHERE id = 'some-league-id';
