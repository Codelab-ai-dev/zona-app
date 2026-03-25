import '../../domain/entities/match_entity.dart';
import '../../domain/entities/team_entity.dart';

/// Configuration for fixture generation
class FixtureConfig {
  final String tournamentId;
  final DateTime startDate;
  final DateTime endDate;
  final List<int> matchDays; // 1=Mon...7=Sun (Dart convention)
  final String startTime; // HH:MM
  final String? endTime; // HH:MM or null for auto
  final int fieldsAvailable; // 1-6
  final bool doubleRound; // ida y vuelta
  final int halfTime; // minutes per half (15-45)
  final int breakTime; // halftime break (5-15)
  final int breakBetweenMatches; // rest between matches (0-30)

  const FixtureConfig({
    required this.tournamentId,
    required this.startDate,
    required this.endDate,
    required this.matchDays,
    required this.startTime,
    this.endTime,
    this.fieldsAvailable = 1,
    this.doubleRound = false,
    this.halfTime = 25,
    this.breakTime = 10,
    this.breakBetweenMatches = 5,
  });

  /// Total match duration in minutes
  int get matchDuration => (halfTime * 2) + breakTime + breakBetweenMatches;

  /// Start time as minutes from midnight
  int get startMinutes {
    final parts = startTime.split(':');
    return int.parse(parts[0]) * 60 + int.parse(parts[1]);
  }

  /// End time as minutes from midnight (null if auto mode)
  int? get endMinutes {
    if (endTime == null) return null;
    final parts = endTime!.split(':');
    return int.parse(parts[0]) * 60 + int.parse(parts[1]);
  }
}

/// A single match pair in a round
class FixtureMatchPair {
  final TeamEntity home;
  final TeamEntity away;

  const FixtureMatchPair({required this.home, required this.away});
}

/// A round of matches with optional bye team
class FixtureRound {
  final int round;
  final List<FixtureMatchPair> matches;
  final TeamEntity? byeTeam;

  const FixtureRound({
    required this.round,
    required this.matches,
    this.byeTeam,
  });
}

/// A fully scheduled match ready for preview/save
class GeneratedMatch {
  final String tournamentId;
  final int round;
  final TeamEntity homeTeam;
  final TeamEntity awayTeam;
  final String date; // YYYY-MM-DD
  final String time; // HH:MM
  final int field;
  final TeamEntity? byeTeam; // bye team for this round (if any)
  final String? groupName; // group identifier for group_knockout

  const GeneratedMatch({
    required this.tournamentId,
    required this.round,
    required this.homeTeam,
    required this.awayTeam,
    required this.date,
    required this.time,
    required this.field,
    this.byeTeam,
    this.groupName,
  });

  /// Convert to map for Supabase insert
  Map<String, dynamic> toInsertMap() {
    return {
      'tournament_id': tournamentId,
      'home_team_id': homeTeam.id,
      'away_team_id': awayTeam.id,
      'match_date': date,
      'match_time': time,
      'field_number': field,
      'round': round,
      'status': MatchStatus.scheduled.toDbString(),
      'phase': 'regular',
      'is_published': false,
    };
  }
}
