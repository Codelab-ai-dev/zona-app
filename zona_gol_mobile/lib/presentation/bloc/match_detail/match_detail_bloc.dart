import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../domain/repositories/match_repository.dart';
import '../../../domain/usecases/get_match_detail_usecase.dart';
import '../../../domain/usecases/save_match_player_stats_usecase.dart';
import 'match_detail_event.dart';
import 'match_detail_state.dart';

class MatchDetailBloc extends Bloc<MatchDetailEvent, MatchDetailState> {
  final GetMatchDetailUseCase getMatchDetailUseCase;
  final SaveMatchPlayerStatsUseCase saveMatchPlayerStatsUseCase;
  final MatchRepository matchRepository;

  MatchDetailBloc({
    required this.getMatchDetailUseCase,
    required this.saveMatchPlayerStatsUseCase,
    required this.matchRepository,
  }) : super(const MatchDetailInitial()) {
    on<LoadMatchDetailEvent>(_onLoadMatchDetail);
    on<RefreshMatchDetailEvent>(_onRefreshMatchDetail);
    on<SaveMatchPlayerStatsEvent>(_onSaveMatchPlayerStats);
    on<UpdateMatchStatusEvent>(_onUpdateMatchStatus);
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

  Future<void> _onSaveMatchPlayerStats(
    SaveMatchPlayerStatsEvent event,
    Emitter<MatchDetailState> emit,
  ) async {
    emit(const MatchPlayerStatsSaving());

    final result = await saveMatchPlayerStatsUseCase(
      SaveMatchPlayerStatsParams(
        matchId: event.matchId,
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        homeEntries: event.homeEntries,
        awayEntries: event.awayEntries,
        observations: event.observations,
      ),
    );

    result.fold(
      (failure) => emit(MatchPlayerStatsError(failure.message)),
      (_) => emit(const MatchPlayerStatsSaved()),
    );
  }

  Future<void> _onUpdateMatchStatus(
    UpdateMatchStatusEvent event,
    Emitter<MatchDetailState> emit,
  ) async {
    emit(const MatchStatusUpdating());

    final result = await matchRepository.updateMatchStatus(
      matchId: event.matchId,
      status: event.status,
    );

    result.fold(
      (failure) => emit(MatchStatusUpdateError(failure.message)),
      (match) => emit(MatchStatusUpdated(match)),
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
        homePlayerStats: detail.homePlayerStats,
        awayPlayerStats: detail.awayPlayerStats,
        refereeObservations: detail.refereeObservations,
      )),
    );
  }
}
