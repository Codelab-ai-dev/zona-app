import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../domain/entities/match_entity.dart';
import '../../../domain/repositories/match_repository.dart';
import '../../../domain/usecases/get_match_detail_usecase.dart';
import '../../../domain/usecases/update_match_result_usecase.dart';
import 'match_detail_event.dart';
import 'match_detail_state.dart';

class MatchDetailBloc extends Bloc<MatchDetailEvent, MatchDetailState> {
  final GetMatchDetailUseCase getMatchDetailUseCase;
  final UpdateMatchResultUseCase updateMatchResultUseCase;
  final MatchRepository matchRepository;

  MatchDetailBloc({
    required this.getMatchDetailUseCase,
    required this.updateMatchResultUseCase,
    required this.matchRepository,
  }) : super(const MatchDetailInitial()) {
    on<LoadMatchDetailEvent>(_onLoadMatchDetail);
    on<RefreshMatchDetailEvent>(_onRefreshMatchDetail);
    on<SubmitMatchResultEvent>(_onSubmitMatchResult);
    on<UpdateMatchStatusEvent>(_onUpdateMatchStatus);
    on<ToggleMatchPublishedEvent>(_onTogglePublished);
  }

  Future<void> _onLoadMatchDetail(
    LoadMatchDetailEvent event,
    Emitter<MatchDetailState> emit,
  ) async {
    emit(const MatchDetailLoading());
    await _fetchMatchDetail(event.matchId, emit);
  }

  Future<void> _onRefreshMatchDetail(
    RefreshMatchDetailEvent event,
    Emitter<MatchDetailState> emit,
  ) async {
    await _fetchMatchDetail(event.matchId, emit);
  }

  Future<void> _onSubmitMatchResult(
    SubmitMatchResultEvent event,
    Emitter<MatchDetailState> emit,
  ) async {
    emit(const MatchResultSaving());

    final result = await updateMatchResultUseCase(
      UpdateMatchResultParams(
        matchId: event.match.id,
        homeTeamId: event.match.homeTeamId,
        awayTeamId: event.match.awayTeamId,
        result: event.result,
      ),
    );

    result.fold(
      (failure) => emit(MatchResultError(failure.message)),
      (_) => emit(const MatchResultSaved()),
    );
  }

  Future<void> _onUpdateMatchStatus(
    UpdateMatchStatusEvent event,
    Emitter<MatchDetailState> emit,
  ) async {
    emit(const MatchActionInProgress());

    final result = await matchRepository.updateMatchStatus(
      matchId: event.matchId,
      status: event.status,
    );

    result.fold(
      (failure) => emit(MatchActionError(failure.message)),
      (_) => emit(MatchActionSuccess(
          'Estado actualizado: ${event.status.displayText}')),
    );
  }

  Future<void> _onTogglePublished(
    ToggleMatchPublishedEvent event,
    Emitter<MatchDetailState> emit,
  ) async {
    emit(const MatchActionInProgress());

    final result = await matchRepository.setMatchPublished(
      event.matchId,
      event.isPublished,
    );

    result.fold(
      (failure) => emit(MatchActionError(failure.message)),
      (_) => emit(MatchActionSuccess(event.isPublished
          ? 'Partido publicado'
          : 'Partido oculto al público')),
    );
  }

  Future<void> _fetchMatchDetail(
    String matchId,
    Emitter<MatchDetailState> emit,
  ) async {
    final result = await getMatchDetailUseCase(
      GetMatchDetailParams(matchId: matchId),
    );

    result.fold(
      (failure) => emit(MatchDetailError(failure.message)),
      (detail) => emit(MatchDetailLoaded(
        match: detail.match,
        refereeObservations: detail.refereeObservations,
      )),
    );
  }
}
