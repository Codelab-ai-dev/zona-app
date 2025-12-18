import 'package:freezed_annotation/freezed_annotation.dart';

part 'match_model.freezed.dart';
part 'match_model.g.dart';

@freezed
class MatchModel with _$MatchModel {
  const MatchModel._();

  const factory MatchModel({
    required String id,
    @JsonKey(name: 'tournament_id') required String tournamentId,
    @JsonKey(name: 'home_team_id') required String homeTeamId,
    @JsonKey(name: 'away_team_id') required String awayTeamId,
    @JsonKey(name: 'match_date') required DateTime matchDate,
    String? location,
    @JsonKey(name: 'jornada_number') int? jornadaNumber,
    required String status, // 'scheduled', 'in_progress', 'finished', 'cancelled', 'postponed'
    String? phase, // 'regular', 'playoffs', 'final'
    @JsonKey(name: 'playoff_round') String? playoffRound, // 'quarter_finals', 'semi_finals', 'final'
    @JsonKey(name: 'home_score') int? homeScore,
    @JsonKey(name: 'away_score') int? awayScore,
    @JsonKey(name: 'referee_notes') String? refereeNotes,
    @JsonKey(name: 'is_forfeit') @Default(false) bool isForfeit,
    @JsonKey(name: 'forfeit_winner') String? forfeitWinner, // 'home' or 'away'
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _MatchModel;

  factory MatchModel.fromJson(Map<String, dynamic> json) =>
      _$MatchModelFromJson(json);

  // Helper methods - Status
  bool get isScheduled => status == 'scheduled';
  bool get isInProgress => status == 'in_progress';
  bool get isFinished => status == 'finished';
  bool get isCancelled => status == 'cancelled';
  bool get isPostponed => status == 'postponed';

  String get statusDisplay {
    switch (status) {
      case 'scheduled':
        return 'Programado';
      case 'in_progress':
        return 'En curso';
      case 'finished':
        return 'Finalizado';
      case 'cancelled':
        return 'Cancelado';
      case 'postponed':
        return 'Pospuesto';
      default:
        return status;
    }
  }

  // Helper methods - Phase
  bool get isRegularPhase => phase == 'regular' || phase == null;
  bool get isPlayoffPhase => phase == 'playoffs';
  bool get isFinalPhase => phase == 'final';

  String get phaseDisplay {
    switch (phase) {
      case 'regular':
        return 'Fase Regular';
      case 'playoffs':
        return 'Liguilla';
      case 'final':
        return 'Final';
      default:
        return phase ?? 'Regular';
    }
  }

  // Helper methods - Playoff Round
  String get playoffRoundDisplay {
    if (playoffRound == null) return '';

    switch (playoffRound) {
      case 'quarter_finals':
        return 'Cuartos de Final';
      case 'semi_finals':
        return 'Semifinal';
      case 'final':
        return 'Final';
      default:
        return playoffRound!;
    }
  }

  // Score helpers
  String get scoreText {
    if (!hasScore) return '-';
    return '$homeScore - $awayScore';
  }

  bool get hasScore => homeScore != null && awayScore != null;

  bool get isHomeWinner {
    if (!hasScore || !isFinished) return false;
    return homeScore! > awayScore!;
  }

  bool get isAwayWinner {
    if (!hasScore || !isFinished) return false;
    return awayScore! > homeScore!;
  }

  bool get isDraw {
    if (!hasScore || !isFinished) return false;
    return homeScore == awayScore;
  }

  String? get winnerTeamId {
    if (!isFinished) return null;
    if (isForfeit && forfeitWinner != null) {
      return forfeitWinner == 'home' ? homeTeamId : awayTeamId;
    }
    if (isHomeWinner) return homeTeamId;
    if (isAwayWinner) return awayTeamId;
    return null; // Draw
  }

  // Date helpers
  bool get isToday {
    final now = DateTime.now();
    return matchDate.year == now.year &&
        matchDate.month == now.month &&
        matchDate.day == now.day;
  }

  bool get isTomorrow {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    return matchDate.year == tomorrow.year &&
        matchDate.month == tomorrow.month &&
        matchDate.day == tomorrow.day;
  }

  bool get isPast => matchDate.isBefore(DateTime.now());
  bool get isFuture => matchDate.isAfter(DateTime.now());

  String get jornadaDisplay {
    if (jornadaNumber == null) return '';
    return 'Jornada $jornadaNumber';
  }

  // Can register attendance
  bool get canRegisterAttendance {
    // Can register if match is today or in progress
    return isToday || isInProgress;
  }

  // Match result display for notifications
  String get resultDisplay {
    if (!isFinished) return 'Partido no finalizado';
    if (isForfeit) {
      return 'Partido ganado por forfeit: ${forfeitWinner == 'home' ? 'Local' : 'Visitante'}';
    }
    if (isDraw) {
      return 'Empate $scoreText';
    }
    return 'Resultado: $scoreText';
  }
}
