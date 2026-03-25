import '../../domain/entities/team_entity.dart';
import 'fixture_config.dart';

/// Pure Dart fixture generator using Berger tables (round-robin algorithm)
///
/// Supports:
/// - League format (all-vs-all)
/// - Knockout format (not applicable for round-robin, handled separately)
/// - Group+Knockout format (round-robin per group)
/// - Double round (ida y vuelta)
/// - Odd team handling with bye/rest
/// - Existing match detection to avoid duplicates
class FixtureGenerator {
  FixtureGenerator._();

  /// Generate round-robin fixtures for a list of teams
  ///
  /// Uses the circle method (polygon scheduling):
  /// - If odd teams: add null placeholder for bye
  /// - Fix the last team, physically rotate the rest each round
  /// - Pair position i with position (n-2-i), fixed team pairs with position 0
  /// - Double round: append reversed home/away rounds
  static List<FixtureRound> generateRoundRobin(
    List<TeamEntity> teams, {
    bool doubleRound = false,
    int roundOffset = 0,
  }) {
    if (teams.length < 2) return [];

    // Build slots: null = bye placeholder for odd team count
    final List<TeamEntity?> slots = List<TeamEntity?>.from(teams);
    if (slots.length.isOdd) slots.add(null);

    final n = slots.length; // always even
    final totalRounds = n - 1;

    // Fixed team stays in place, rotating list physically rotates
    final fixed = slots[n - 1];
    final rotating = slots.sublist(0, n - 1);

    final List<FixtureRound> rounds = [];

    for (int r = 0; r < totalRounds; r++) {
      final List<FixtureMatchPair> matchPairs = [];
      TeamEntity? byeTeam;

      // Match 0: rotating[0] vs fixed team
      final team1 = rotating[0];
      final team2 = fixed;

      if (team1 == null) {
        byeTeam = team2;
      } else if (team2 == null) {
        byeTeam = team1;
      } else {
        // Alternate home/away for balance
        if (r % 2 == 0) {
          matchPairs.add(FixtureMatchPair(home: team1, away: team2));
        } else {
          matchPairs.add(FixtureMatchPair(home: team2, away: team1));
        }
      }

      // Remaining matches: rotating[i] vs rotating[n-2-i]
      for (int i = 1; i < n ~/ 2; i++) {
        final home = rotating[i];
        final away = rotating[n - 2 - i];

        if (home == null) {
          byeTeam = away;
        } else if (away == null) {
          byeTeam = home;
        } else {
          matchPairs.add(FixtureMatchPair(home: home, away: away));
        }
      }

      if (matchPairs.isNotEmpty) {
        rounds.add(FixtureRound(
          round: r + 1 + roundOffset,
          matches: matchPairs,
          byeTeam: byeTeam,
        ));
      }

      // Rotate: move last element to front
      final last = rotating.removeLast();
      rotating.insert(0, last);
    }

    // Double round: append rounds with reversed home/away
    if (doubleRound) {
      final returnRounds = <FixtureRound>[];
      for (final round in rounds) {
        returnRounds.add(FixtureRound(
          round: round.round + totalRounds,
          matches: round.matches
              .map((m) => FixtureMatchPair(home: m.away, away: m.home))
              .toList(),
          byeTeam: round.byeTeam,
        ));
      }
      rounds.addAll(returnRounds);
    }

    return rounds;
  }

  /// Generate round-robin per group for group_knockout format
  ///
  /// Teams are grouped by their groupName property.
  /// Round numbers are offset sequentially across groups.
  static List<FixtureRound> generateGroupRoundRobin(
    List<TeamEntity> teams, {
    bool doubleRound = false,
    List<String>? selectedGroups,
  }) {
    // Group teams by their groupName
    final Map<String, List<TeamEntity>> groups = {};
    for (final team in teams) {
      final group = team.groupName ?? 'A';
      groups.putIfAbsent(group, () => []).add(team);
    }

    // Sort group names
    final sortedGroupNames = groups.keys.toList()..sort();

    // Filter to selected groups if specified
    final groupsToProcess = selectedGroups != null
        ? sortedGroupNames.where((g) => selectedGroups.contains(g)).toList()
        : sortedGroupNames;

    final List<FixtureRound> allRounds = [];
    int roundOffset = 0;

    for (final groupName in groupsToProcess) {
      final groupTeams = groups[groupName]!;
      if (groupTeams.length < 2) continue;

      final groupRounds = generateRoundRobin(
        groupTeams,
        doubleRound: doubleRound,
        roundOffset: roundOffset,
      );

      // Tag matches with group name
      for (final round in groupRounds) {
        allRounds.add(round);
      }

      if (groupRounds.isNotEmpty) {
        roundOffset = groupRounds.last.round;
      }
    }

    return allRounds;
  }

  /// Calculate how many time slots fit in a day
  static int calculateSlotsPerDay(FixtureConfig config) {
    if (config.endMinutes != null) {
      final availableMinutes = config.endMinutes! - config.startMinutes;
      if (availableMinutes <= 0) return 1;
      return (availableMinutes / config.matchDuration).floor().clamp(1, 100);
    }
    // Auto mode: no limit, but cap at a reasonable number
    return 20;
  }

  /// Assign dates, times, and fields to rounds
  static List<GeneratedMatch> assignSchedule(
    List<FixtureRound> rounds,
    FixtureConfig config,
  ) {
    if (rounds.isEmpty) return [];

    final List<GeneratedMatch> scheduled = [];
    final matchDays = config.matchDays;
    if (matchDays.isEmpty) return [];

    final slotsPerDay = calculateSlotsPerDay(config);
    final totalSlotsPerDay = slotsPerDay * config.fieldsAvailable;

    // Find the first valid match day on or after startDate
    DateTime currentDate = _findNextMatchDay(config.startDate, matchDays);
    int slotInDay = 0;

    for (final round in rounds) {
      for (final matchPair in round.matches) {
        // Check if we've exceeded the end date
        if (currentDate.isAfter(config.endDate)) {
          // Still schedule but warn - the validation should catch this
          // Continue anyway to show all matches in preview
        }

        // Calculate time for this slot
        final fieldIndex = slotInDay % config.fieldsAvailable;
        final timeSlotIndex = slotInDay ~/ config.fieldsAvailable;
        final timeMinutes = config.startMinutes + (timeSlotIndex * config.matchDuration);
        final timeStr = _minutesToTimeStr(timeMinutes);

        scheduled.add(GeneratedMatch(
          tournamentId: config.tournamentId,
          round: round.round,
          homeTeam: matchPair.home,
          awayTeam: matchPair.away,
          date: _formatDate(currentDate),
          time: timeStr,
          field: fieldIndex + 1,
          byeTeam: round.byeTeam,
          groupName: matchPair.home.groupName,
        ));

        slotInDay++;

        // If we've filled all slots for this day, advance to next match day
        if (slotInDay >= totalSlotsPerDay) {
          slotInDay = 0;
          currentDate = _findNextMatchDay(
            currentDate.add(const Duration(days: 1)),
            matchDays,
          );
        }
      }

      // After each round, advance to the next match day
      // (each round starts on a new day)
      if (slotInDay > 0) {
        slotInDay = 0;
        currentDate = _findNextMatchDay(
          currentDate.add(const Duration(days: 1)),
          matchDays,
        );
      }
    }

    return scheduled;
  }

  /// Filter out existing match pairs to avoid duplicates
  static List<FixtureRound> filterExistingMatches(
    List<FixtureRound> rounds,
    Set<String> existingPairs,
    bool isDoubleRound,
  ) {
    final filtered = <FixtureRound>[];

    for (final round in rounds) {
      final filteredMatches = <FixtureMatchPair>[];
      for (final match in round.matches) {
        final pairKey = _makePairKey(
          match.home.id,
          match.away.id,
          isDoubleRound,
        );
        if (!existingPairs.contains(pairKey)) {
          filteredMatches.add(match);
        }
      }
      if (filteredMatches.isNotEmpty) {
        filtered.add(FixtureRound(
          round: round.round,
          matches: filteredMatches,
          byeTeam: round.byeTeam,
        ));
      }
    }

    return filtered;
  }

  /// Create a pair key for deduplication
  /// For single round: sorted pair (A-B == B-A)
  /// For double round: directional pair (A-B != B-A)
  static String _makePairKey(String homeId, String awayId, bool isDoubleRound) {
    if (isDoubleRound) {
      return '$homeId-$awayId';
    }
    final ids = [homeId, awayId]..sort();
    return '${ids[0]}-${ids[1]}';
  }

  /// Build set of existing pair keys from database data
  static Set<String> buildExistingPairSet(
    List<Map<String, dynamic>> existingMatches,
    bool isDoubleRound,
  ) {
    final pairs = <String>{};
    for (final match in existingMatches) {
      final homeId = match['home_team_id'] as String;
      final awayId = match['away_team_id'] as String;
      pairs.add(_makePairKey(homeId, awayId, isDoubleRound));
    }
    return pairs;
  }

  /// Validate that the configuration has enough capacity for all matches
  static String? validateCapacity(FixtureConfig config, int totalMatches) {
    if (totalMatches == 0) return null;

    final matchDays = config.matchDays;
    if (matchDays.isEmpty) {
      return 'Selecciona al menos un día de partido';
    }

    // Count available match days in date range
    int availableDays = 0;
    DateTime date = config.startDate;
    while (!date.isAfter(config.endDate)) {
      if (matchDays.contains(date.weekday)) {
        availableDays++;
      }
      date = date.add(const Duration(days: 1));
    }

    if (availableDays == 0) {
      return 'No hay días de partido disponibles en el rango seleccionado';
    }

    final slotsPerDay = calculateSlotsPerDay(config);
    final totalCapacity = availableDays * slotsPerDay * config.fieldsAvailable;

    if (totalCapacity < totalMatches) {
      return 'Capacidad insuficiente: $totalCapacity espacios disponibles para $totalMatches partidos. '
          'Agrega más días, canchas o amplía el rango de fechas.';
    }

    return null;
  }

  /// Find the next valid match day on or after the given date
  static DateTime _findNextMatchDay(DateTime date, List<int> matchDays) {
    // Cap at 365 days to prevent infinite loop
    for (int i = 0; i < 365; i++) {
      final candidate = date.add(Duration(days: i));
      if (matchDays.contains(candidate.weekday)) {
        return candidate;
      }
    }
    return date; // Fallback
  }

  /// Format DateTime to YYYY-MM-DD string
  static String _formatDate(DateTime date) {
    return '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
  }

  /// Convert minutes from midnight to HH:MM string
  static String _minutesToTimeStr(int minutes) {
    final h = (minutes ~/ 60).clamp(0, 23);
    final m = minutes % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
  }
}
