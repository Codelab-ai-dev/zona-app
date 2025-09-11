-- Create RLS Policies
-- Migration: 20241201000011_create_rls_policies.sql

-- Users policies
CREATE POLICY "Users can view their own profile" ON users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admins can view all users" ON users 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Super admins can manage all users" ON users 
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Leagues policies (public read, admin write)
CREATE POLICY "Anyone can view active leagues" ON leagues 
FOR SELECT USING (is_active = true);

CREATE POLICY "League admins can manage their leagues" ON leagues 
FOR ALL USING (
  auth.uid() = admin_id OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Authenticated users can create leagues" ON leagues 
FOR INSERT WITH CHECK (
  auth.uid() = admin_id AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'league_admin'))
);

-- Tournaments policies
CREATE POLICY "Anyone can view tournaments of active leagues" ON tournaments 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND is_active = true)
);

CREATE POLICY "League admins can manage tournaments" ON tournaments 
FOR ALL USING (
  EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND admin_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Teams policies
CREATE POLICY "Anyone can view active teams" ON teams 
FOR SELECT USING (is_active = true);

CREATE POLICY "Team owners can manage their teams" ON teams 
FOR ALL USING (
  auth.uid() = owner_id OR
  EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND admin_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Authenticated users can create teams" ON teams 
FOR INSERT WITH CHECK (
  auth.uid() = owner_id AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'league_admin', 'team_owner'))
);

-- Players policies
CREATE POLICY "Anyone can view active players" ON players 
FOR SELECT USING (
  is_active = true AND EXISTS (SELECT 1 FROM teams WHERE id = team_id AND is_active = true)
);

CREATE POLICY "Team owners can manage their players" ON players 
FOR ALL USING (
  EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM teams t JOIN leagues l ON t.league_id = l.id WHERE t.id = team_id AND l.admin_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Matches policies
CREATE POLICY "Anyone can view matches" ON matches 
FOR SELECT USING (true);

CREATE POLICY "League admins can manage matches" ON matches 
FOR ALL USING (
  EXISTS (SELECT 1 FROM tournaments t JOIN leagues l ON t.league_id = l.id WHERE t.id = tournament_id AND l.admin_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Player stats policies
CREATE POLICY "Anyone can view player stats" ON player_stats 
FOR SELECT USING (true);

CREATE POLICY "League admins can manage player stats" ON player_stats 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM players p 
    JOIN teams t ON p.team_id = t.id 
    JOIN leagues l ON t.league_id = l.id 
    WHERE p.id = player_id AND l.admin_id = auth.uid()
  ) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);