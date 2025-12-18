import 'package:freezed_annotation/freezed_annotation.dart';

part 'player_stats_model.freezed.dart';
part 'player_stats_model.g.dart';

@freezed
class PlayerStatsModel with _$PlayerStatsModel {
  const PlayerStatsModel._();

  const factory PlayerStatsModel({
    required String id,
    @JsonKey(name: 'player_id') required String playerId,
    @JsonKey(name: 'tournament_id') required String tournamentId,
    @JsonKey(name: 'matches_played') @Default(0) int matchesPlayed,
    @Default(0) int goals,
    @Default(0) int assists,
    @JsonKey(name: 'yellow_cards') @Default(0) int yellowCards,
    @JsonKey(name: 'red_cards') @Default(0) int redCards,
    @JsonKey(name: 'minutes_played') @Default(0) int minutesPlayed,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _PlayerStatsModel;

  factory PlayerStatsModel.fromJson(Map<String, dynamic> json) =>
      _$PlayerStatsModelFromJson(json);

  // Calculated fields
  double get goalsPerMatch {
    if (matchesPlayed == 0) return 0.0;
    return goals / matchesPlayed;
  }

  double get assistsPerMatch {
    if (matchesPlayed == 0) return 0.0;
    return assists / matchesPlayed;
  }

  int get totalContributions => goals + assists;

  double get contributionsPerMatch {
    if (matchesPlayed == 0) return 0.0;
    return totalContributions / matchesPlayed;
  }

  double get minutesPerGoal {
    if (goals == 0) return 0.0;
    return minutesPlayed / goals;
  }

  int get averageMinutesPerMatch {
    if (matchesPlayed == 0) return 0;
    return (minutesPlayed / matchesPlayed).round();
  }

  // Display helpers
  String get statsDisplay => '$goals G, $assists A';

  String get cardDisplay {
    if (yellowCards == 0 && redCards == 0) return 'Sin tarjetas';
    if (redCards > 0) return '$yellowCards amarillas, $redCards rojas';
    return '$yellowCards amarillas';
  }

  bool get hasRedCard => redCards > 0;
  bool get hasYellowCards => yellowCards > 0;

  int get disciplineScore {
    // Lower is better (0 is perfect discipline)
    return (yellowCards * 1) + (redCards * 3);
  }

  String get performanceRating {
    final avgContributions = contributionsPerMatch;
    if (avgContributions >= 1.5) return 'Estrella';
    if (avgContributions >= 1.0) return 'Excelente';
    if (avgContributions >= 0.5) return 'Bueno';
    if (avgContributions > 0) return 'Regular';
    return 'Bajo';
  }

  // Comparison for top scorers
  int compareGoals(PlayerStatsModel other) {
    return other.goals.compareTo(goals);
  }

  // Comparison for top assisters
  int compareAssists(PlayerStatsModel other) {
    return other.assists.compareTo(assists);
  }

  // Comparison for discipline (more cards = worse)
  int compareDiscipline(PlayerStatsModel other) {
    return disciplineScore.compareTo(other.disciplineScore);
  }
}
