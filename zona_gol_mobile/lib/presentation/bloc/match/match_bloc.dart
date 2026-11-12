import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/utils/fixture_config.dart';
import '../../../domain/entities/match_entity.dart';
import '../../../domain/repositories/match_repository.dart';
import '../../../domain/usecases/get_pending_matches_usecase.dart';
import 'match_event.dart';
import 'match_state.dart';

/// Match Bloc
/// Manages match lists, fixture generation and manual round editing
class MatchBloc extends Bloc<MatchEvent, MatchState> {
  final GetPendingMatchesUseCase getPendingMatchesUseCase;
  final MatchRepository matchRepository;

  MatchBloc({
    required this.getPendingMatchesUseCase,
    required this.matchRepository,
  }) : super(const MatchInitial()) {
    on<LoadPendingMatchesEvent>(_onLoadPendingMatches);
    on<LoadMatchesByTournamentEvent>(_onLoadMatchesByTournament);
    on<GenerateFixturesEvent>(_onGenerateFixtures);
    on<SaveFixturesEvent>(_onSaveFixtures);
    on<SaveManualRoundEvent>(_onSaveManualRound);
    on<CreateMatchEvent>(_onCreateMatch);
    on<PublishRoundEvent>(_onPublishRound);
  }

  Future<void> _onLoadPendingMatches(
    LoadPendingMatchesEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const MatchLoading());
    final result = await getPendingMatchesUseCase(
      GetPendingMatchesParams(leagueId: event.leagueId),
    );
    result.fold(
      (failure) => emit(MatchError(failure.message)),
      (matches) => emit(MatchesLoaded(matches)),
    );
  }

  Future<void> _onLoadMatchesByTournament(
    LoadMatchesByTournamentEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const MatchLoading());
    await _loadTournament(event.tournamentId, emit, phase: event.phase);
  }

  Future<void> _loadTournament(
    String tournamentId,
    Emitter<MatchState> emit, {
    MatchPhase? phase,
  }) async {
    final result = await matchRepository.getMatchesByTournament(
      tournamentId,
      phase: phase,
    );
    result.fold(
      (failure) => emit(MatchError(failure.message)),
      (matches) => emit(MatchesLoaded(matches)),
    );
  }

  /// Preview: the server generates the calendar without saving it
  Future<void> _onGenerateFixtures(
    GenerateFixturesEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const MatchLoading());
    final request = event.request.copyWith(dryRun: true);
    final result = await matchRepository.generateFixtures(request);

    result.fold(
      (failure) => emit(MatchError(failure.message)),
      (generated) {
        final fixtures = GeneratedMatch.fromDryRun(generated.matches, event.teams);
        if (fixtures.isEmpty) {
          emit(const MatchError('No se generaron partidos para los equipos seleccionados'));
          return;
        }
        emit(FixturesGenerated(
          fixtures: fixtures,
          totalRounds: generated.rounds,
          totalMatches: fixtures.length,
          request: request.copyWith(dryRun: false),
        ));
      },
    );
  }

  Future<void> _onSaveFixtures(
    SaveFixturesEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const FixturesSaving());
    final result = await matchRepository.generateFixtures(
      event.request.copyWith(dryRun: false),
    );
    result.fold(
      (failure) => emit(MatchError(failure.message)),
      (generated) => emit(FixturesSaved(matchCount: generated.matches.length)),
    );
  }

  /// Save a manually created/edited round: deletes, then updates, then creates
  Future<void> _onSaveManualRound(
    SaveManualRoundEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const FixturesSaving());
    var totalSaved = 0;

    if (event.matchIdsToDelete.isNotEmpty) {
      final deleted = await matchRepository.deleteMatches(event.matchIdsToDelete);
      if (deleted.isLeft()) {
        deleted.fold((f) => emit(MatchError(f.message)), (_) {});
        return;
      }
    }

    for (final update in event.matchesToUpdate) {
      final updated = await matchRepository.updateMatchSchedule(
        update.matchId,
        update.update,
      );
      if (updated.isLeft()) {
        updated.fold((f) => emit(MatchError(f.message)), (_) {});
        return;
      }
      totalSaved++;
    }

    if (event.matchesToCreate.isNotEmpty) {
      final created = await matchRepository.createMatches(
        event.tournamentId,
        event.matchesToCreate,
      );
      if (created.isLeft()) {
        created.fold((f) => emit(MatchError(f.message)), (_) {});
        return;
      }
      created.fold((_) {}, (matches) => totalSaved += matches.length);
    }

    emit(FixturesSaved(matchCount: totalSaved));
  }

  Future<void> _onCreateMatch(
    CreateMatchEvent event,
    Emitter<MatchState> emit,
  ) async {
    emit(const MatchLoading());
    final result = await matchRepository.createMatch(NewMatch(
      tournamentId: event.tournamentId,
      homeTeamId: event.homeTeamId,
      awayTeamId: event.awayTeamId,
      matchDate: event.matchDate,
      matchTime: event.matchTime,
      fieldNumber: event.fieldNumber,
      round: event.round,
    ));
    result.fold(
      (failure) => emit(MatchError(failure.message)),
      (_) => emit(const MatchCreated()),
    );
  }

  Future<void> _onPublishRound(
    PublishRoundEvent event,
    Emitter<MatchState> emit,
  ) async {
    final result = await matchRepository.publishRound(
      tournamentId: event.tournamentId,
      round: event.round,
      isPublished: event.isPublished,
    );
    result.fold(
      (failure) => emit(MatchActionResult(failure.message, success: false)),
      (_) => emit(MatchActionResult(event.isPublished
          ? 'Jornada ${event.round} publicada'
          : 'Jornada ${event.round} oculta al público')),
    );
    await _loadTournament(event.tournamentId, emit);
  }
}
