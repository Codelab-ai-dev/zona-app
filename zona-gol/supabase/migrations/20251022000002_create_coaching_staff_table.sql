-- Create coaching_staff table to store technical team members
CREATE TABLE IF NOT EXISTS coaching_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- Director Técnico, Asistente, Preparador Físico, etc.
  photo TEXT,
  birth_date DATE,
  cedula TEXT, -- ID card number
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_coaching_staff_team_id ON coaching_staff(team_id);
CREATE INDEX IF NOT EXISTS idx_coaching_staff_is_active ON coaching_staff(is_active);
CREATE INDEX IF NOT EXISTS idx_coaching_staff_cedula ON coaching_staff(cedula);

-- Add RLS (Row Level Security) policies
ALTER TABLE coaching_staff ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read coaching staff
CREATE POLICY "coaching_staff_select_policy" ON coaching_staff
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow team owners to insert their own coaching staff
CREATE POLICY "coaching_staff_insert_policy" ON coaching_staff
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = coaching_staff.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- Policy: Allow team owners to update their own coaching staff
CREATE POLICY "coaching_staff_update_policy" ON coaching_staff
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = coaching_staff.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- Policy: Allow team owners to delete their own coaching staff
CREATE POLICY "coaching_staff_delete_policy" ON coaching_staff
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = coaching_staff.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE TRIGGER set_coaching_staff_updated_at
  BEFORE UPDATE ON coaching_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE coaching_staff IS 'Stores coaching staff (cuerpo técnico) members for each team';
