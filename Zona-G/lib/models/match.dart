enum MatchStatus { scheduled, in_progress, finished, cancelled }

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