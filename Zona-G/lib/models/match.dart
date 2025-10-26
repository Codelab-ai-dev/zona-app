enum MatchStatus { scheduled, in_progress, finished, cancelled }
enum MatchPhase { regular, playoffs }
enum PlayoffRound { quarterfinals, semifinals, final_match, third_place }

class Match {
  final String id;
  final String homeTeamId;
  final String awayTeamId;
  final String? homeTeamName;
  final String? awayTeamName;
  final String? homeTeamLogo;
  final String? awayTeamLogo;
  final DateTime matchDate;
  final String? venue;
  final MatchStatus status;
  final int? homeScore;
  final int? awayScore;
  final String tournamentId;
  final String? tournamentName;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final MatchPhase phase;
  final PlayoffRound? playoffRound;
  final int? playoffPosition;

  Match({
    required this.id,
    required this.homeTeamId,
    required this.awayTeamId,
    this.homeTeamName,
    this.awayTeamName,
    this.homeTeamLogo,
    this.awayTeamLogo,
    required this.matchDate,
    this.venue,
    required this.status,
    this.homeScore,
    this.awayScore,
    required this.tournamentId,
    this.tournamentName,
    this.createdAt,
    this.updatedAt,
    this.phase = MatchPhase.regular,
    this.playoffRound,
    this.playoffPosition,
  });

  factory Match.fromJson(Map<String, dynamic> json) {
    return Match(
      id: json['id'],
      homeTeamId: json['home_team_id'],
      awayTeamId: json['away_team_id'],
      homeTeamName: json['home_team']?['name'],
      awayTeamName: json['away_team']?['name'],
      homeTeamLogo: json['home_team']?['logo'],
      awayTeamLogo: json['away_team']?['logo'],
      matchDate: DateTime.parse(json['match_date']),
      venue: json['venue'],
      status: _parseMatchStatus(json['status']),
      homeScore: json['home_score'],
      awayScore: json['away_score'],
      tournamentId: json['tournament_id'],
      tournamentName: json['tournament']?['name'],
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : null,
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at']) : null,
      phase: _parseMatchPhase(json['phase']),
      playoffRound: _parsePlayoffRound(json['playoff_round']),
      playoffPosition: json['playoff_position'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'home_team_id': homeTeamId,
      'away_team_id': awayTeamId,
      'match_date': matchDate.toIso8601String(),
      'venue': venue,
      'status': status.name,
      'home_score': homeScore,
      'away_score': awayScore,
      'tournament_id': tournamentId,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  static MatchStatus _parseMatchStatus(String? status) {
    switch (status) {
      case 'in_progress':
        return MatchStatus.in_progress;
      case 'finished':
        return MatchStatus.finished;
      case 'cancelled':
        return MatchStatus.cancelled;
      case 'scheduled':
      default:
        return MatchStatus.scheduled;
    }
  }

  static MatchPhase _parseMatchPhase(String? phase) {
    switch (phase) {
      case 'playoffs':
        return MatchPhase.playoffs;
      case 'regular':
      default:
        return MatchPhase.regular;
    }
  }

  static PlayoffRound? _parsePlayoffRound(String? round) {
    if (round == null) return null;
    switch (round) {
      case 'quarterfinals':
        return PlayoffRound.quarterfinals;
      case 'semifinals':
        return PlayoffRound.semifinals;
      case 'final':
        return PlayoffRound.final_match;
      case 'third_place':
        return PlayoffRound.third_place;
      default:
        return null;
    }
  }

  String get statusText {
    switch (status) {
      case MatchStatus.scheduled:
        return 'Programado';
      case MatchStatus.in_progress:
        return 'En Progreso';
      case MatchStatus.finished:
        return 'Finalizado';
      case MatchStatus.cancelled:
        return 'Cancelado';
    }
  }

  String get phaseText {
    switch (phase) {
      case MatchPhase.regular:
        return 'Temporada Regular';
      case MatchPhase.playoffs:
        return playoffRoundText;
    }
  }

  String get playoffRoundText {
    if (playoffRound == null) return 'Liguilla';
    switch (playoffRound!) {
      case PlayoffRound.quarterfinals:
        return 'Cuartos de Final';
      case PlayoffRound.semifinals:
        return 'Semifinales';
      case PlayoffRound.final_match:
        return 'Final';
      case PlayoffRound.third_place:
        return 'Tercer Lugar';
    }
  }

  bool get isPlayoff {
    return phase == MatchPhase.playoffs;
  }

  String get scoreText {
    if (homeScore != null && awayScore != null) {
      return '$homeScore - $awayScore';
    }
    return 'vs';
  }

  bool get canRegisterAttendance {
    return status == MatchStatus.scheduled || status == MatchStatus.in_progress;
  }

  @override
  String toString() {
    return 'Match(id: $id, homeTeam: $homeTeamName, awayTeam: $awayTeamName, date: $matchDate, status: ${status.name})';
  }
}