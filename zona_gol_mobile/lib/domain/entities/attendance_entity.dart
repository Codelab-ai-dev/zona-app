import 'package:equatable/equatable.dart';

/// A match the scanned player's team plays on the scan date and that can
/// still take attendance (scheduled or in progress).
class TodayMatchEntity extends Equatable {
  final String matchId;
  final String tournamentId;

  /// `HH:MM`, when the match has a kick-off time.
  final String? matchTime;
  final String status;
  final String homeTeamName;
  final String awayTeamName;
  final int? fieldNumber;

  /// The player already has a QR check-in for this match.
  final bool alreadyRegistered;

  const TodayMatchEntity({
    required this.matchId,
    required this.tournamentId,
    this.matchTime,
    required this.status,
    required this.homeTeamName,
    required this.awayTeamName,
    this.fieldNumber,
    this.alreadyRegistered = false,
  });

  /// "Local vs Visita"
  String get teamsDisplay => '$homeTeamName vs $awayTeamName';

  /// "Local vs Visita · HH:MM"
  String get displayName =>
      matchTime == null ? teamsDisplay : '$teamsDisplay \u00b7 $matchTime';

  TodayMatchEntity copyWith({bool? alreadyRegistered}) => TodayMatchEntity(
        matchId: matchId,
        tournamentId: tournamentId,
        matchTime: matchTime,
        status: status,
        homeTeamName: homeTeamName,
        awayTeamName: awayTeamName,
        fieldNumber: fieldNumber,
        alreadyRegistered: alreadyRegistered ?? this.alreadyRegistered,
      );

  @override
  List<Object?> get props => [
        matchId,
        tournamentId,
        matchTime,
        status,
        homeTeamName,
        awayTeamName,
        fieldNumber,
        alreadyRegistered,
      ];
}

/// QR Player Data — parsed from QR code
class QRPlayerData extends Equatable {
  final String playerId;
  final String playerName;
  final String teamId;
  final int jerseyNumber;
  final String? leagueId;

  const QRPlayerData({
    required this.playerId,
    required this.playerName,
    required this.teamId,
    required this.jerseyNumber,
    this.leagueId,
  });

  @override
  List<Object?> get props =>
      [playerId, playerName, teamId, jerseyNumber, leagueId];

  String get displayName {
    if (jerseyNumber > 0) return '#$jerseyNumber $playerName';
    return playerName;
  }
}
