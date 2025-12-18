import 'package:freezed_annotation/freezed_annotation.dart';

part 'team_stats_model.freezed.dart';
part 'team_stats_model.g.dart';

@freezed
class TeamStatsModel with _$TeamStatsModel {
  const TeamStatsModel._();

  const factory TeamStatsModel({
    required String id,
    @JsonKey(name: 'team_id') required String teamId,
    @JsonKey(name: 'tournament_id') required String tournamentId,
    @JsonKey(name: 'matches_played') @Default(0) int matchesPlayed,
    @JsonKey(name: 'matches_won') @Default(0) int matchesWon,
    @JsonKey(name: 'matches_drawn') @Default(0) int matchesDrawn,
    @JsonKey(name: 'matches_lost') @Default(0) int matchesLost,
    @JsonKey(name: 'goals_for') @Default(0) int goalsFor,
    @JsonKey(name: 'goals_against') @Default(0) int goalsAgainst,
    @Default(0) int points,
    @JsonKey(name: 'yellow_cards') @Default(0) int yellowCards,
    @JsonKey(name: 'red_cards') @Default(0) int redCards,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _TeamStatsModel;

  factory TeamStatsModel.fromJson(Map<String, dynamic> json) =>
      _$TeamStatsModelFromJson(json);

  // Calculated fields
  int get goalDifference => goalsFor - goalsAgainst;

  double get winPercentage {
    if (matchesPlayed == 0) return 0.0;
    return (matchesWon / matchesPlayed) * 100;
  }

  double get drawPercentage {
    if (matchesPlayed == 0) return 0.0;
    return (matchesDrawn / matchesPlayed) * 100;
  }

  double get lossPercentage {
    if (matchesPlayed == 0) return 0.0;
    return (matchesLost / matchesPlayed) * 100;
  }

  double get goalsPerMatch {
    if (matchesPlayed == 0) return 0.0;
    return goalsFor / matchesPlayed;
  }

  double get goalsAgainstPerMatch {
    if (matchesPlayed == 0) return 0.0;
    return goalsAgainst / matchesPlayed;
  }

  double get pointsPerMatch {
    if (matchesPlayed == 0) return 0.0;
    return points / matchesPlayed;
  }

  // Display helpers
  String get recordDisplay => '$matchesWon-$matchesDrawn-$matchesLost';

  String get goalDifferenceDisplay {
    if (goalDifference > 0) return '+$goalDifference';
    return goalDifference.toString();
  }

  String get formDisplay {
    final percentage = winPercentage;
    if (percentage >= 70) return 'Excelente';
    if (percentage >= 50) return 'Buena';
    if (percentage >= 30) return 'Regular';
    return 'Mala';
  }

  // Comparison helpers
  int compareTo(TeamStatsModel other) {
    // 1. Points
    if (points != other.points) {
      return other.points.compareTo(points);
    }

    // 2. Goal difference
    if (goalDifference != other.goalDifference) {
      return other.goalDifference.compareTo(goalDifference);
    }

    // 3. Goals for
    if (goalsFor != other.goalsFor) {
      return other.goalsFor.compareTo(goalsFor);
    }

    // 4. Matches won
    if (matchesWon != other.matchesWon) {
      return other.matchesWon.compareTo(matchesWon);
    }

    // Equal
    return 0;
  }
}
