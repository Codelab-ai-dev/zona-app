# 🔒 Security Documentation - Zona Gol

## Table of Contents
1. [Security Overview](#security-overview)
2. [SSL/TLS Configuration](#ssltls-configuration)
3. [Environment-Based Security](#environment-based-security)
4. [Supabase Security Model](#supabase-security-model)
5. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
6. [Build & Deployment](#build--deployment)
7. [Security Checklist](#security-checklist)

---

## Security Overview

### ✅ What We've Secured

1. **SSL Certificate Validation** - Only bypassed in development
2. **Cleartext Traffic** - Disabled in production builds
3. **Environment Configuration** - Separate configs for dev/staging/prod
4. **Session Security** - Tokens stored in Keychain/Keystore
5. **Row Level Security** - Database-level access control

### ⚠️ Important Security Principles

**The ANON key being in the client code is NORMAL and SAFE** - as long as Row Level Security (RLS) is properly configured.

Here's why:
- The ANON key is **meant to be public** in Supabase architecture
- **RLS policies are the real security** - they enforce who can access what
- Even if someone extracts the ANON key from your APK, they still can't:
  - Access data without proper authentication
  - Bypass RLS policies
  - See data from other leagues/teams
  - Modify data without permissions

Think of it like this:
- **ANON key** = Key to enter the building (public)
- **RLS policies** = Security guards checking your ID at every door (private)

---

## SSL/TLS Configuration

### The Problem (Before)

```dart
// ❌ DANGEROUS: Always bypassed SSL validation
class MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (cert, host, port) => true; // ALWAYS accepts bad certs
  }
}
```

**Why this was dangerous:**
- Allows Man-in-the-Middle (MITM) attacks
- Anyone on the same WiFi can intercept traffic
- Attackers could steal session tokens, passwords, user data
- **In a public soccer field WiFi = DISASTER**

### The Solution (After)

```dart
// ✅ SAFE: Environment-aware SSL configuration
if (AppConfig.allowSSLBypass) {
  // Only in development
  HttpOverrides.global = DevHttpOverrides();
} else {
  // Production: strict SSL validation
  HttpOverrides.global = ProductionHttpOverrides();
}
```

**How it works:**
- `ENV=dev` → Allows self-signed certificates (for local testing)
- `ENV=prod` → **Strict SSL validation** (rejects invalid certificates)
- Production builds **will crash** if you try to use `DevHttpOverrides`

---

## Environment-Based Security

### Build Environments

We support 3 environments:

| Environment | SSL Bypass | Cleartext | Debug Logs | Use Case |
|-------------|-----------|-----------|------------|----------|
| **dev** | ✅ Yes | ✅ Yes | ✅ Yes | Local development |
| **staging** | ❌ No | ❌ No | ✅ Yes | Testing |
| **prod** | ❌ No | ❌ No | ❌ No | Production |

### How to Build for Each Environment

#### Development (default)
```bash
flutter run
# or
flutter run --dart-define=ENV=dev
```

#### Staging
```bash
flutter build apk \
  --dart-define=ENV=staging \
  --dart-define=SUPABASE_URL=https://your-staging-url.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your_staging_key
```

#### Production
```bash
flutter build apk --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=https://your-prod-url.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your_prod_key
```

### Validation at Runtime

The app validates configuration on startup:

```dart
// Production validation
if (AppConfig.isProduction) {
  // ✅ SUPABASE_URL must be provided
  // ✅ SUPABASE_ANON_KEY must be provided
  // ✅ SSL bypass must be disabled
  // ✅ Cleartext traffic must be disabled

  // If any check fails → App crashes with clear error message
}
```

---

## Supabase Security Model

### Authentication Flow

```
1. User opens app
   ↓
2. Login with email/password
   ↓
3. Supabase Auth validates credentials
   ↓
4. Returns JWT tokens (access + refresh)
   ↓
5. App stores tokens in secure storage (Keychain/Keystore)
   ↓
6. Every API request includes JWT in Authorization header
   ↓
7. Supabase validates JWT
   ↓
8. RLS policies check permissions
   ↓
9. Data returned (or access denied)
```

### Why ANON Key is Safe

**The ANON key allows anonymous access to your database.**

But wait... isn't that bad?

**NO**, because:

1. **Anonymous != Unrestricted**
   - ANON role can only do what RLS policies allow
   - Without RLS, ANON can see nothing

2. **RLS Policies are the Real Security**
   ```sql
   -- Example: Users can only see their own data
   CREATE POLICY "Users can only view own profile"
   ON users FOR SELECT
   USING (auth.uid() = id);
   ```

3. **Authentication Tokens Override ANON**
   - When user logs in, they get a **user token** (not ANON)
   - User token has their user ID embedded
   - RLS policies check `auth.uid()` which comes from the token

4. **Exposed ANON Key Can't**:
   - ❌ Access authenticated endpoints without valid user token
   - ❌ Bypass RLS policies
   - ❌ See data from other users/leagues
   - ❌ Modify data without permissions

**Think of it like a hotel:**
- ANON key = Lobby access card (everyone has one)
- User token = Room key (only you have yours)
- RLS policies = Electronic locks on each room (check room key)

---

## Row Level Security (RLS) Policies

### Critical Tables & Policies

#### 1. **`asistencias_qr` Table** (Player Check-ins)

**Security Goal:**
- Only league admins can mark attendance
- Only for matches in their own league
- Can't check-in players from other leagues

**RLS Policy:**

```sql
-- ✅ RECOMMENDED POLICY
CREATE POLICY "league_admins_can_insert_attendance"
ON asistencias_qr
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be authenticated
  auth.role() = 'authenticated'
  AND
  -- User must be league_admin or super_admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('league_admin', 'super_admin')
  )
  AND
  -- Match must belong to user's league
  EXISTS (
    SELECT 1 FROM matches
    JOIN users ON users.league_id = matches.league_id
    WHERE matches.id = asistencias_qr.match_id
    AND users.id = auth.uid()
  )
  AND
  -- Player must belong to a team in the same league
  EXISTS (
    SELECT 1 FROM players
    JOIN teams ON teams.id = players.team_id
    JOIN users ON users.league_id = teams.league_id
    WHERE players.id = asistencias_qr.player_id
    AND users.id = auth.uid()
  )
);
```

**What this does:**

1. **Checks authentication**: `auth.role() = 'authenticated'`
   - Anonymous users can't insert

2. **Checks user role**: User must be `league_admin` or `super_admin`
   - Regular users and team owners can't mark attendance

3. **Checks match belongs to user's league**:
   ```sql
   matches.league_id = user's league_id
   ```

4. **Checks player belongs to same league**:
   ```sql
   player → team → league = user's league
   ```

**Example scenarios:**

✅ **ALLOWED:**
```
User: admin@liga-norte.com (league_admin, Liga Norte)
Match: Liga Norte - Jornada 5
Player: Juan Pérez (Equipo A, Liga Norte)
→ Can mark attendance ✅
```

❌ **DENIED:**
```
User: admin@liga-norte.com (league_admin, Liga Norte)
Match: Liga Sur - Jornada 3  ← Different league!
Player: Carlos López (Equipo Z, Liga Sur)
→ Cannot mark attendance ❌
```

❌ **DENIED:**
```
User: coach@equipo-a.com (team_owner, Liga Norte)
                         ↑ Not league_admin!
Match: Liga Norte - Jornada 5
Player: Juan Pérez (Equipo A, Liga Norte)
→ Cannot mark attendance ❌ (wrong role)
```

---

#### 2. **`users` Table**

**Security Goal:**
- Users can only see their own profile
- Can't see other users' data
- Super admins can see all users

**RLS Policies:**

```sql
-- SELECT: Users can only view their own profile
CREATE POLICY "users_can_view_own_profile"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR
  -- Super admins can see all users
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

-- UPDATE: Users can only update their own profile
CREATE POLICY "users_can_update_own_profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  -- Can't change their own role
  (SELECT role FROM users WHERE id = auth.uid()) = role
);

-- INSERT: Only super admins can create users
CREATE POLICY "only_super_admin_can_create_users"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);
```

---

#### 3. **`players` Table**

**Security Goal:**
- Users can only see players from their league
- Only league admins can modify players

**RLS Policies:**

```sql
-- SELECT: Can view players from own league
CREATE POLICY "users_can_view_league_players"
ON players FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    JOIN users ON users.league_id = teams.league_id
    WHERE teams.id = players.team_id
    AND users.id = auth.uid()
  )
);

-- INSERT/UPDATE: Only league admins
CREATE POLICY "league_admins_can_manage_players"
ON players FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    JOIN users ON users.league_id = teams.league_id
    WHERE teams.id = players.team_id
    AND users.id = auth.uid()
    AND users.role IN ('league_admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    JOIN users ON users.league_id = teams.league_id
    WHERE teams.id = players.team_id
    AND users.id = auth.uid()
    AND users.role IN ('league_admin', 'super_admin')
  )
);
```

---

#### 4. **`matches` Table**

```sql
-- SELECT: Can view matches from own league
CREATE POLICY "users_can_view_league_matches"
ON matches FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.league_id = matches.league_id
  )
);

-- UPDATE: Only league admins can update matches
CREATE POLICY "league_admins_can_update_matches"
ON matches FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.league_id = matches.league_id
    AND users.role IN ('league_admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.league_id = matches.league_id
    AND users.role IN ('league_admin', 'super_admin')
  )
);
```

---

### Testing RLS Policies

You can test RLS policies in Supabase SQL Editor:

```sql
-- Test as a specific user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here", "role": "authenticated"}';

-- Try to insert attendance
INSERT INTO asistencias_qr (match_id, player_id, attendance_status)
VALUES ('match-uuid', 'player-uuid', 'present');

-- If policy is correct:
-- ✅ Success if user has permission
-- ❌ Error if user lacks permission
```

---

## Build & Deployment

### Development Build

```bash
# Debug build with SSL bypass and cleartext
flutter run

# Or explicitly
flutter run --dart-define=ENV=dev
```

**This build:**
- ⚠️ Allows SSL bypass
- ⚠️ Allows cleartext traffic
- ✅ Useful for local testing
- ❌ **NEVER distribute this build**

---

### Production Build

```bash
# Android APK
flutter build apk --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=https://srv1190257.hstgr.cloud \
  --dart-define=SUPABASE_ANON_KEY=your_actual_anon_key_here

# Android App Bundle (for Play Store)
flutter build appbundle --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=https://srv1190257.hstgr.cloud \
  --dart-define=SUPABASE_ANON_KEY=your_actual_anon_key_here

# iOS
flutter build ios --release \
  --dart-define=ENV=prod \
  --dart-define=SUPABASE_URL=https://srv1190257.hstgr.cloud \
  --dart-define=SUPABASE_ANON_KEY=your_actual_anon_key_here
```

**This build:**
- ✅ SSL certificate validation ENABLED
- ✅ Cleartext traffic DISABLED
- ✅ No debug logs
- ✅ Secure for distribution

---

### Using Build Scripts

We've created helper scripts in `/scripts/`:

```bash
# Development
./scripts/build_dev.sh

# Production
./scripts/build_prod.sh
```

---

## Security Checklist

### Before Deploying to Production

- [ ] **Environment is set to `prod`**
  ```bash
  --dart-define=ENV=prod
  ```

- [ ] **SUPABASE_URL is provided via --dart-define**
  ```bash
  --dart-define=SUPABASE_URL=https://...
  ```

- [ ] **SUPABASE_ANON_KEY is provided via --dart-define**
  ```bash
  --dart-define=SUPABASE_ANON_KEY=eyJ...
  ```

- [ ] **SSL bypass is DISABLED**
  - Check: `AppConfig.allowSSLBypass` should be `false`

- [ ] **Cleartext traffic is DISABLED**
  - Check: `android:usesCleartextTraffic="false"` in release manifest

- [ ] **RLS policies are enabled on all tables**
  ```sql
  ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
  ```

- [ ] **RLS policies are tested**
  - Test with different user roles
  - Verify cross-league access is blocked
  - Check that team owners can't access admin functions

- [ ] **No hardcoded secrets in code**
  - API keys via --dart-define only
  - No passwords in source code

- [ ] **Debug logs are disabled**
  - `AppConfig.enableDebugLogs` should be `false` in prod

---

## Common Attack Vectors & Mitigations

### 1. Man-in-the-Middle (MITM)

**Attack:**
- Attacker sets up fake WiFi
- Intercepts HTTP traffic
- Steals session tokens

**Mitigation:**
- ✅ SSL certificate validation (production)
- ✅ No cleartext traffic (production)
- ✅ Tokens stored in secure storage (Keychain/Keystore)

---

### 2. Extracted APK Analysis

**Attack:**
- User downloads APK
- Decompiles with jadx/apktool
- Extracts ANON key

**Mitigation:**
- ✅ ANON key is meant to be public
- ✅ RLS policies prevent unauthorized access
- ✅ User tokens required for all sensitive operations

---

### 3. SQL Injection

**Attack:**
- Malicious input in forms
- Attempts to execute SQL

**Mitigation:**
- ✅ Supabase uses parameterized queries
- ✅ Dart client sanitizes inputs
- ✅ RLS provides additional layer

---

### 4. Cross-League Data Access

**Attack:**
- Liga Norte admin tries to access Liga Sur data

**Mitigation:**
- ✅ RLS policies check `league_id`
- ✅ Policies validate user's league matches resource's league
- ✅ Super admin required for cross-league access

---

## Monitoring & Logging

### What to Monitor

1. **Failed authentication attempts**
   - Multiple failed logins = potential attack

2. **Unauthorized access attempts**
   - RLS policy violations
   - Check Supabase logs

3. **Unusual data access patterns**
   - User accessing way more data than usual
   - Requests from unexpected locations

### Supabase Logs

Check Supabase dashboard → Logs:
- Auth logs
- Database logs
- API logs

---

## Emergency Response

### If ANON Key is Compromised

**Don't panic!** The ANON key being public is normal.

But if you need to rotate it:

1. Generate new ANON key in Supabase dashboard
2. Rebuild apps with new key
3. Force users to update

### If User Token is Stolen

1. User should logout (invalidates token)
2. Login again (new token issued)
3. Old token is revoked

### If Database is Breached

1. Check RLS policies are enabled
2. Review audit logs
3. Rotate service keys (not ANON key)
4. Force password reset for affected users

---

## Additional Resources

- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Flutter Secure Storage](https://pub.dev/packages/flutter_secure_storage)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)

---

**Last Updated:** 2025-12-13
**Version:** 1.0.0
**Maintained by:** Development Team
