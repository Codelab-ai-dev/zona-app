import 'package:equatable/equatable.dart';
import '../../../core/utils/fixture_config.dart';
import '../../../domain/entities/match_entity.dart';

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

/// Match Result Updated State
class MatchResultUpdated extends MatchState {
  final MatchEntity match;

  const MatchResultUpdated(this.match);

  @override
  List<Object?> get props => [match];
}

/// Updating Match State (for showing loading on specific match)
class MatchUpdating extends MatchState {
  final String matchId;

  const MatchUpdating(this.matchId);

  @override
  List<Object?> get props => [matchId];
}

/// Error State
class MatchError extends MatchState {
  final String message;

  const MatchError(this.message);

  @override
  List<Object?> get props => [message];
}

/// Match Created Successfully
class MatchCreated extends MatchState {
  final String message;

  const MatchCreated({this.message = 'Partido creado exitosamente'});

  @override
  List<Object?> get props => [message];
}

/// Fixtures Generated (preview data)
class FixturesGenerated extends MatchState {
  final List<GeneratedMatch> fixtures;
  final int totalRounds;
  final int totalMatches;

  const FixturesGenerated({
    required this.fixtures,
    required this.totalRounds,
    required this.totalMatches,
  });

  @override
  List<Object?> get props => [fixtures, totalRounds, totalMatches];
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
