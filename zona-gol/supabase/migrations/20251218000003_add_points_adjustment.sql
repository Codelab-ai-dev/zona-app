-- Add points_adjustment column for penalty deductions
-- This allows league admins to deduct points for rule violations

ALTER TABLE team_stats
ADD COLUMN IF NOT EXISTS points_adjustment INTEGER DEFAULT 0;

-- Add a comment explaining the column
COMMENT ON COLUMN team_stats.points_adjustment IS 'Points adjustment (negative for penalties, positive for bonuses). Added to calculated points.';

-- Add adjustment_reason to track why points were adjusted
ALTER TABLE team_stats
ADD COLUMN IF NOT EXISTS adjustment_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN team_stats.adjustment_reason IS 'Reason for the points adjustment (e.g., "Incumplimiento de reglamento")';
