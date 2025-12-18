import 'package:equatable/equatable.dart';
import '../../../domain/entities/tournament_entity.dart';

/// Tournament States
/// Defines all possible states of the Tournament BLoC
abstract class TournamentState extends Equatable {
  const TournamentState();

  @override
  List<Object?> get props => [];
}

/// Initial State
class TournamentInitial extends TournamentState {
  const TournamentInitial();
}

/// Loading State
class TournamentLoading extends TournamentState {
  const TournamentLoading();
}

/// Tournaments Loaded State (list)
class TournamentsLoaded extends TournamentState {
  final List<TournamentEntity> tournaments;

  const TournamentsLoaded(this.tournaments);

  @override
  List<Object?> get props => [tournaments];
}

/// Tournament Detail Loaded State (single)
class TournamentDetailLoaded extends TournamentState {
  final TournamentEntity tournament;

  const TournamentDetailLoaded(this.tournament);

  @override
  List<Object?> get props => [tournament];
}

/// Tournament Created State
class TournamentCreated extends TournamentState {
  final TournamentEntity tournament;

  const TournamentCreated(this.tournament);

  @override
  List<Object?> get props => [tournament];
}

/// Error State
class TournamentError extends TournamentState {
  final String message;

  const TournamentError(this.message);

  @override
  List<Object?> get props => [message];
}
