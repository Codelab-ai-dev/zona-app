import 'package:equatable/equatable.dart';

/// Player Events
abstract class PlayerEvent extends Equatable {
  const PlayerEvent();

  @override
  List<Object?> get props => [];
}

/// Load Players By Team
class LoadPlayersByTeamEvent extends PlayerEvent {
  final String teamId;
  final bool onlyActive;

  const LoadPlayersByTeamEvent({
    required this.teamId,
    this.onlyActive = false,
  });

  @override
  List<Object?> get props => [teamId, onlyActive];
}

/// Load Player By ID
class LoadPlayerByIdEvent extends PlayerEvent {
  final String playerId;

  const LoadPlayerByIdEvent({required this.playerId});

  @override
  List<Object?> get props => [playerId];
}

/// Create Player
class CreatePlayerEvent extends PlayerEvent {
  final String name;
  final String teamId;
  final String? position;
  final int? jerseyNumber;
  final String? photo;
  final DateTime? birthDate;

  const CreatePlayerEvent({
    required this.name,
    required this.teamId,
    this.position,
    this.jerseyNumber,
    this.photo,
    this.birthDate,
  });

  @override
  List<Object?> get props => [name, teamId, position, jerseyNumber, photo, birthDate];
}

/// Update Player
class UpdatePlayerEvent extends PlayerEvent {
  final String playerId;
  final String? name;
  final String? position;
  final int? jerseyNumber;
  final String? photo;
  final DateTime? birthDate;

  const UpdatePlayerEvent({
    required this.playerId,
    this.name,
    this.position,
    this.jerseyNumber,
    this.photo,
    this.birthDate,
  });

  @override
  List<Object?> get props => [playerId, name, position, jerseyNumber, photo, birthDate];
}

/// Delete Player (deactivates it)
class DeletePlayerEvent extends PlayerEvent {
  final String playerId;

  const DeletePlayerEvent({required this.playerId});

  @override
  List<Object?> get props => [playerId];
}

/// Reset Player State
class ResetPlayerStateEvent extends PlayerEvent {
  const ResetPlayerStateEvent();
}

/// Load Players By League (batch QR generation)
class LoadPlayersByLeagueEvent extends PlayerEvent {
  final String leagueId;
  final bool? idVerified;

  const LoadPlayersByLeagueEvent({
    required this.leagueId,
    this.idVerified,
  });

  @override
  List<Object?> get props => [leagueId, idVerified];
}

/// Load the league's identity verification queue and counters
class LoadPlayerVerificationEvent extends PlayerEvent {
  final String leagueId;

  const LoadPlayerVerificationEvent({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}

/// Verify (with the reviewed document) or unverify a player's ID
class VerifyPlayerEvent extends PlayerEvent {
  final String playerId;
  final String playerName;
  final bool verified;
  final String? documentKey;

  const VerifyPlayerEvent({
    required this.playerId,
    required this.playerName,
    required this.verified,
    this.documentKey,
  });

  @override
  List<Object?> get props => [playerId, playerName, verified, documentKey];
}
