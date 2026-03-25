import 'package:equatable/equatable.dart';
import '../../../domain/entities/player_entity.dart';

/// Player States
abstract class PlayerState extends Equatable {
  const PlayerState();

  @override
  List<Object?> get props => [];
}

/// Initial State
class PlayerInitial extends PlayerState {
  const PlayerInitial();
}

/// Loading State
class PlayerLoading extends PlayerState {
  const PlayerLoading();
}

/// Players Loaded State (List)
class PlayersLoaded extends PlayerState {
  final List<PlayerEntity> players;

  const PlayersLoaded(this.players);

  @override
  List<Object?> get props => [players];
}

/// Single Player Loaded State
class PlayerDetailLoaded extends PlayerState {
  final PlayerEntity player;

  const PlayerDetailLoaded(this.player);

  @override
  List<Object?> get props => [player];
}

/// Player Created State
class PlayerCreated extends PlayerState {
  final PlayerEntity player;

  const PlayerCreated(this.player);

  @override
  List<Object?> get props => [player];
}

/// Player Updated State
class PlayerUpdated extends PlayerState {
  final PlayerEntity player;

  const PlayerUpdated(this.player);

  @override
  List<Object?> get props => [player];
}

/// Player Deleted State
class PlayerDeleted extends PlayerState {
  final String playerId;

  const PlayerDeleted(this.playerId);

  @override
  List<Object?> get props => [playerId];
}

/// League Players Loaded State (with team info)
class LeaguePlayersLoaded extends PlayerState {
  final List<PlayerEntity> players;

  const LeaguePlayersLoaded(this.players);

  @override
  List<Object?> get props => [players];
}

/// Player Verified State
class PlayerVerified extends PlayerState {
  final PlayerEntity player;

  const PlayerVerified(this.player);

  @override
  List<Object?> get props => [player];
}

/// Error State
class PlayerError extends PlayerState {
  final String message;

  const PlayerError(this.message);

  @override
  List<Object?> get props => [message];
}
