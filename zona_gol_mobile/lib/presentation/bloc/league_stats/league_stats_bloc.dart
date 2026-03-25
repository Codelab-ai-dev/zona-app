import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/usecases/get_league_stats_usecase.dart';
import 'league_stats_event.dart';
import 'league_stats_state.dart';

class LeagueStatsBloc extends Bloc<LeagueStatsEvent, LeagueStatsState> {
  final GetLeagueStatsUseCase _getLeagueStatsUseCase;

  LeagueStatsBloc({
    required GetLeagueStatsUseCase getLeagueStatsUseCase,
  })  : _getLeagueStatsUseCase = getLeagueStatsUseCase,
        super(LeagueStatsInitial()) {
    on<LoadLeagueStatsEvent>(_onLoadLeagueStats);
  }

  Future<void> _onLoadLeagueStats(
    LoadLeagueStatsEvent event,
    Emitter<LeagueStatsState> emit,
  ) async {
    emit(LeagueStatsLoading());

    final result = await _getLeagueStatsUseCase(event.leagueId);

    result.fold(
      (failure) => emit(LeagueStatsError(message: failure.message)),
      (stats) => emit(LeagueStatsLoaded(stats: stats)),
    );
  }
}
