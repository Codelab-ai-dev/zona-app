import 'package:equatable/equatable.dart';

import '../../../core/utils/fixture_config.dart';
import '../../../domain/entities/match_entity.dart';
import '../../../domain/repositories/match_repository.dart';

/// Match States
abstract class MatchState extends Equatable {
  const MatchState();

  @override
  List<Object?> get props => [];
}

/// Initial State
class MatchInitial extends MatchState {
  const MatchInitial();
}

/// Loading State
class MatchLoading extends MatchState {
  const MatchLoading();
}

/// Matches Loaded State (list)
class MatchesLoaded extends MatchState {
  final List<MatchEntity> matches;

  const MatchesLoaded(this.matches);

  @override
  List<Object?> get props => [matches];
}

/// Error State
class MatchError extends MatchState {
  final String message;

  const MatchError(this.message);

  @override
  List<Object?> get props => [message];
}

/// An action on a loaded list (e.g. publishing a round) finished; the list
/// is reloaded right after
class MatchActionResult extends MatchState {
  final String message;
  final bool success;

  const MatchActionResult(this.message, {this.success = true});

  @override
  List<Object?> get props => [message, success];
}

/// Match Created Successfully
class MatchCreated extends MatchState {
  final String message;

  const MatchCreated({this.message = 'Partido creado exitosamente'});

  @override
  List<Object?> get props => [message];
}

/// Fixtures Generated (preview data from the server's dry run)
class FixturesGenerated extends MatchState {
  final List<GeneratedMatch> fixtures;
  final int totalRounds;
  final int totalMatches;

  /// The request to send again (without dry run) to save this calendar
  final FixtureRequest request;

  const FixturesGenerated({
    required this.fixtures,
    required this.totalRounds,
    required this.totalMatches,
    required this.request,
  });

  @override
  List<Object?> get props => [fixtures, totalRounds, totalMatches, request];
}

/// Fixtures Saving
class FixturesSaving extends MatchState {
  const FixturesSaving();
}

/// Fixtures Saved Successfully
class FixturesSaved extends MatchState {
  final int matchCount;

  const FixturesSaved({required this.matchCount});

  @override
  List<Object?> get props => [matchCount];
}
