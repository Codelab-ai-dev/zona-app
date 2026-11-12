import '../../domain/entities/match_entity.dart';
import '../../domain/entities/team_entity.dart';

/// A generated (not yet saved) match of a fixture preview, with the team
/// entities resolved for display
class GeneratedMatch {
  final String tournamentId;
  final int round;
  final TeamEntity homeTeam;
  final TeamEntity awayTeam;
  final String date; // YYYY-MM-DD
  final String time; // HH:MM
  final int field;
  final TeamEntity? byeTeam; // team resting this round (if any)
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

  /// Builds the preview rows from the server's dry run. Rows whose teams are
  /// unknown are skipped. The resting team is recorded on the first match of
  /// its round, so it is spread to every match of that round.
  static List<GeneratedMatch> fromDryRun(
    List<MatchEntity> matches,
    List<TeamEntity> teams,
  ) {
    final byId = {for (final t in teams) t.id: t};
    final byeByRound = <int, TeamEntity>{};
    for (final m in matches) {
      final bye = byId[m.byeTeamId];
      if (bye != null && m.round != null) byeByRound[m.round!] = bye;
    }

    final result = <GeneratedMatch>[];
    for (final m in matches) {
      final home = byId[m.homeTeamId];
      final away = byId[m.awayTeamId];
      if (home == null || away == null) continue;
      final d = m.matchDate;
      result.add(GeneratedMatch(
        tournamentId: m.tournamentId,
        round: m.round ?? 0,
        homeTeam: home,
        awayTeam: away,
        date: '${d.year.toString().padLeft(4, '0')}-'
            '${d.month.toString().padLeft(2, '0')}-'
            '${d.day.toString().padLeft(2, '0')}',
        time: m.matchTime ?? '',
        field: m.fieldNumber ?? 1,
        byeTeam: byeByRound[m.round],
        groupName: home.groupName,
      ));
    }
    return result;
  }
}
