# 🔒 Database Constraints - Preventing Bugs in Production

## Problem B: Duplicate Attendance Records (Race Condition)

### The Issue

**Scenario:**
```
Time: 19:30:00
Device A (Tablet 1): Scans Juan Pérez QR → Checks if exists → No duplicates found
Device B (Tablet 2): Scans Juan Pérez QR → Checks if exists → No duplicates found
Time: 19:30:01
Device A: Inserts attendance record for Juan Pérez ✅
Device B: Inserts attendance record for Juan Pérez ✅  ← DUPLICATE!

Result: Juan Pérez registered twice in the same match 🐛
```

**Why this happens:**
- App checks for duplicates with `SELECT` query
- Then inserts with separate `INSERT` query
- There's a **race window** between SELECT and INSERT
- Two devices can both pass the SELECT check before either inserts

### The Solution: Database Constraint

Instead of relying on app logic, enforce uniqueness at the **database level**.

#### Step 1: Add Unique Constraint

```sql
-- ✅ Prevent duplicate attendance records
-- This constraint ensures that one player can only be registered once per match
CREATE UNIQUE INDEX idx_asistencias_qr_unique_player_match
ON asistencias_qr(player_id, match_id);
```

**What this does:**
- Database will **reject** any INSERT that violates the constraint
- Works even if 100 devices try to insert simultaneously
- Returns error: `duplicate key value violates unique constraint`

#### Step 2: Handle Error Gracefully in Flutter

```dart
// In your attendance registration code
try {
  await supabase
      .from('asistencias_qr')
      .insert({
        'player_id': playerId,
        'match_id': matchId,
        'attendance_status': 'present',
        'registered_at': DateTime.now().toIso8601String(),
      });

  print('✅ Asistencia registrada');
  // Show success message
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text('✅ Jugador registrado exitosamente'),
      backgroundColor: Colors.green,
    ),
  );

} catch (e) {
  final errorMessage = e.toString().toLowerCase();

  // ✅ Check if error is due to duplicate key
  if (errorMessage.contains('duplicate key') ||
      errorMessage.contains('unique constraint') ||
      errorMessage.contains('idx_asistencias_qr_unique_player_match')) {

    print('⚠️ Jugador ya registrado previamente');

    // Show friendly message - NOT an error!
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('ℹ️ Este jugador ya está registrado en el partido'),
        backgroundColor: Colors.orange,
      ),
    );

  } else {
    // Different error - show generic message
    print('❌ Error registrando asistencia: $e');

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('❌ Error: ${e.toString()}'),
        backgroundColor: Colors.red,
      ),
    );
  }
}
```

---

## Additional Recommended Constraints

### 1. Prevent Duplicate Players (Same Jersey Number in Team)

**Problem:** Two players with jersey #10 in the same team.

**Solution:**
```sql
-- One jersey number per team
CREATE UNIQUE INDEX idx_players_unique_jersey_per_team
ON players(team_id, jersey_number)
WHERE is_active = true;
```

**Note:** The `WHERE is_active = true` allows retired players to keep their historic jersey numbers while new active players can reuse them.

---

### 2. Prevent Duplicate Team Names in League

**Problem:** Two teams named "Tigres" in the same league.

**Solution:**
```sql
-- Unique team names per league
CREATE UNIQUE INDEX idx_teams_unique_name_per_league
ON teams(league_id, name)
WHERE is_active = true;
```

---

### 3. Prevent Overlapping Match Times (Same Field)

**Problem:** Two matches scheduled at the same time on the same field.

**Solution:**
```sql
-- If you have a field_id column
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE matches ADD CONSTRAINT no_overlapping_matches
EXCLUDE USING gist (
  field_id WITH =,
  tstzrange(match_date, match_date + interval '2 hours') WITH &&
)
WHERE (status != 'cancelled');
```

**Explanation:**
- `tstzrange` creates a time range (match_date + 2 hours duration)
- `WITH &&` checks for overlap
- `EXCLUDE` prevents overlapping ranges
- Only applies to non-cancelled matches

---

## Complete Migration Script

Copy and paste this into Supabase SQL Editor:

```sql
-- ============================================================================
-- DATABASE CONSTRAINTS FOR PRODUCTION SAFETY
-- ============================================================================

-- 1. CRITICAL: Prevent duplicate attendance records (race condition fix)
-- ============================================================================

DO $$
BEGIN
    -- Check if index already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_asistencias_qr_unique_player_match'
    ) THEN
        CREATE UNIQUE INDEX idx_asistencias_qr_unique_player_match
        ON asistencias_qr(player_id, match_id);

        RAISE NOTICE '✅ Created unique index: idx_asistencias_qr_unique_player_match';
    ELSE
        RAISE NOTICE 'ℹ️ Index idx_asistencias_qr_unique_player_match already exists';
    END IF;
END $$;

-- ============================================================================
-- 2. Prevent duplicate jersey numbers in same team
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_players_unique_jersey_per_team'
    ) THEN
        CREATE UNIQUE INDEX idx_players_unique_jersey_per_team
        ON players(team_id, jersey_number)
        WHERE is_active = true;

        RAISE NOTICE '✅ Created unique index: idx_players_unique_jersey_per_team';
    ELSE
        RAISE NOTICE 'ℹ️ Index idx_players_unique_jersey_per_team already exists';
    END IF;
END $$;

-- ============================================================================
-- 3. Prevent duplicate team names in same league
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_teams_unique_name_per_league'
    ) THEN
        CREATE UNIQUE INDEX idx_teams_unique_name_per_league
        ON teams(league_id, name)
        WHERE is_active = true;

        RAISE NOTICE '✅ Created unique index: idx_teams_unique_name_per_league';
    ELSE
        RAISE NOTICE 'ℹ️ Index idx_teams_unique_name_per_league already exists';
    END IF;
END $$;

-- ============================================================================
-- 4. (Optional) Prevent duplicate user emails
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_users_unique_email'
    ) THEN
        CREATE UNIQUE INDEX idx_users_unique_email
        ON users(LOWER(email));

        RAISE NOTICE '✅ Created unique index: idx_users_unique_email';
    ELSE
        RAISE NOTICE 'ℹ️ Index idx_users_unique_email already exists';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check all unique constraints on asistencias_qr
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'asistencias_qr'
AND indexdef LIKE '%UNIQUE%';

-- Check for existing duplicate records (run BEFORE creating constraint)
-- If this returns rows, you have duplicates that need to be cleaned up first
SELECT
    player_id,
    match_id,
    COUNT(*) as duplicate_count
FROM asistencias_qr
GROUP BY player_id, match_id
HAVING COUNT(*) > 1;

-- ============================================================================
-- CLEANUP DUPLICATES (if needed)
-- ============================================================================

-- Only run this if the verification query above found duplicates!

-- Option 1: Keep the oldest record, delete newer duplicates
WITH duplicates AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY player_id, match_id
            ORDER BY registered_at ASC  -- Keep oldest
        ) as rn
    FROM asistencias_qr
)
DELETE FROM asistencias_qr
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Option 2: Keep the newest record, delete older duplicates
WITH duplicates AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY player_id, match_id
            ORDER BY registered_at DESC  -- Keep newest
        ) as rn
    FROM asistencias_qr
)
DELETE FROM asistencias_qr
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- Verify all constraints are active
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'asistencias_qr'::regclass
AND contype = 'u';  -- 'u' = unique constraint

-- Test duplicate prevention (should fail)
-- Uncomment to test:

-- INSERT INTO asistencias_qr (player_id, match_id, attendance_status)
-- VALUES ('test-player-id', 'test-match-id', 'present');

-- INSERT INTO asistencias_qr (player_id, match_id, attendance_status)
-- VALUES ('test-player-id', 'test-match-id', 'present');
-- ^ This should fail with: duplicate key value violates unique constraint

-- Cleanup test data:
-- DELETE FROM asistencias_qr WHERE player_id = 'test-player-id';

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
```

---

## Testing in Development

### Test Case 1: Duplicate Prevention Works

```dart
// Simulate two rapid scans of same player
final playerId = 'test-player-123';
final matchId = 'test-match-456';

// First scan
try {
  await supabase.from('asistencias_qr').insert({
    'player_id': playerId,
    'match_id': matchId,
    'attendance_status': 'present',
  });
  print('✅ First scan: Success');
} catch (e) {
  print('❌ First scan failed (unexpected): $e');
}

// Second scan (should be caught)
try {
  await supabase.from('asistencias_qr').insert({
    'player_id': playerId,
    'match_id': matchId,
    'attendance_status': 'present',
  });
  print('❌ Second scan: Succeeded (BAD - duplicate was created!)');
} catch (e) {
  if (e.toString().contains('duplicate key')) {
    print('✅ Second scan: Correctly rejected duplicate');
  } else {
    print('❌ Second scan: Failed with unexpected error: $e');
  }
}
```

---

## Performance Considerations

### Index Size Impact

**Question:** Will this slow down my database?

**Answer:** No, negligible impact.

**Explanation:**
- Unique indexes are **fast** (B-tree)
- `(player_id, match_id)` is a small compound key
- Typical attendance table: < 100K rows
- Index size: ~1-5 MB
- Query performance: < 1ms

### Write Performance

**Question:** Will inserts be slower?

**Answer:** Slightly, but imperceptible to users.

**Explanation:**
- Index check adds ~0.1-0.5ms to INSERT
- Trade-off: 0.5ms slower vs preventing duplicate bugs
- **Worth it!**

---

## Monitoring & Alerts

### Check for Constraint Violations in Logs

In Supabase Dashboard → Logs → Database:

```
duplicate key value violates unique constraint
```

**What to do if you see this:**
- ✅ Good! The constraint is working
- ✅ User should see friendly "already registered" message
- ⚠️ If happening frequently → investigate race conditions in app logic

---

## Rollback (If Needed)

If you need to remove the constraints:

```sql
-- Remove unique constraint on asistencias_qr
DROP INDEX IF EXISTS idx_asistencias_qr_unique_player_match;

-- Remove other constraints
DROP INDEX IF EXISTS idx_players_unique_jersey_per_team;
DROP INDEX IF EXISTS idx_teams_unique_name_per_league;
DROP INDEX IF EXISTS idx_users_unique_email;
```

---

## Summary

| Constraint | Prevents | Performance Impact | Priority |
|------------|----------|-------------------|----------|
| `idx_asistencias_qr_unique_player_match` | Duplicate attendance | Negligible | 🔴 CRITICAL |
| `idx_players_unique_jersey_per_team` | Duplicate jersey numbers | Negligible | 🟡 Recommended |
| `idx_teams_unique_name_per_league` | Duplicate team names | Negligible | 🟡 Recommended |
| `idx_users_unique_email` | Duplicate emails | Negligible | 🟢 Optional |

---

**Next Steps:**

1. Run the migration script in Supabase SQL Editor
2. Update Flutter code to handle duplicate key errors gracefully
3. Test with simulated race conditions
4. Monitor logs for constraint violations

---

**Last Updated:** 2025-12-13
**Database Version:** PostgreSQL 14+
**Tested With:** Supabase
