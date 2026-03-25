import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../domain/entities/player_stats_entity.dart';
import '../../../domain/repositories/player_stats_repository.dart';
import '../../../domain/usecases/get_discipline_by_league_usecase.dart';
import '../../../domain/usecases/get_player_match_history_usecase.dart';
import '../../../domain/usecases/get_player_stats_by_id_usecase.dart';
import '../../../domain/usecases/get_player_stats_by_team_usecase.dart';
import '../../../domain/usecases/get_top_scorers_by_league_usecase.dart';
import 'player_stats_event.dart';
import 'player_stats_state.dart';

/// Player Stats BLoC
class PlayerStatsBloc extends Bloc<PlayerStatsEvent, PlayerStatsState> {
  final GetPlayerStatsByTeamUseCase getPlayerStatsByTeamUseCase;
  final GetTopScorersByLeagueUseCase getTopScorersByLeagueUseCase;
  final GetDisciplineByLeagueUseCase getDisciplineByLeagueUseCase;
  final GetPlayerStatsByIdUseCase getPlayerStatsByIdUseCase;
  final GetPlayerMatchHistoryUseCase getPlayerMatchHistoryUseCase;
  final PlayerStatsRepository playerStatsRepository;
  final Logger logger = Logger();

  PlayerStatsBloc({
    required this.getPlayerStatsByTeamUseCase,
    required this.getTopScorersByLeagueUseCase,
    required this.getDisciplineByLeagueUseCase,
    required this.getPlayerStatsByIdUseCase,
    required this.getPlayerMatchHistoryUseCase,
    required this.playerStatsRepository,
  }) : super(const PlayerStatsInitial()) {
    on<LoadTeamStatsEvent>(_onLoadTeamStats);
    on<LoadTopScorersEvent>(_onLoadTopScorers);
    on<LoadDisciplineEvent>(_onLoadDiscipline);
    on<LoadPlayerStatsByIdEvent>(_onLoadPlayerStatsById);
    on<LoadPlayerMatchHistoryEvent>(_onLoadPlayerMatchHistory);
    on<ResetPlayerStatsEvent>(_onResetState);
    on<AddExtemporaneousGoalsEvent>(_onAddExtemporaneousGoals);
    on<UpdateExtemporaneousGoalsEvent>(_onUpdateExtemporaneousGoals);
    on<DeleteExtemporaneousGoalsEvent>(_onDeleteExtemporaneousGoals);
  }

  Future<void> _onLoadTeamStats(
    LoadTeamStatsEvent event,
    Emitter<PlayerStatsState> emit,
  ) async {
    emit(const PlayerStatsLoading());
    logger.i('Loading stats for team: ${event.teamId}');

    final result = await getPlayerStatsByTeamUseCase(
      GetPlayerStatsByTeamParams(
        teamId: event.teamId,
        tournamentId: event.tournamentId,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error loading team stats: ${failure.message}');
        emit(PlayerStatsError(failure.message));
      },
      (stats) {
        logger.i('Loaded stats for ${stats.length} players');
        emit(TeamStatsLoaded(stats));
      },
    );
  }

  Future<void> _onLoadTopScorers(
    LoadTopScorersEvent event,
    Emitter<PlayerStatsState> emit,
  ) async {
    emit(const PlayerStatsLoading());
    logger.i('Loading top scorers for league: ${event.leagueId}');

    final result = await getTopScorersByLeagueUseCase(
      GetTopScorersByLeagueParams(
        leagueId: event.leagueId,
        limit: event.limit,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error loading top scorers: ${failure.message}');
        emit(PlayerStatsError(failure.message));
      },
      (scorers) {
        logger.i('Loaded ${scorers.length} top scorers');
        emit(TopScorersLoaded(scorers));
      },
    );
  }

  Future<void> _onLoadDiscipline(
    LoadDisciplineEvent event,
    Emitter<PlayerStatsState> emit,
  ) async {
    emit(const PlayerStatsLoading());
    logger.i('Loading discipline for league: ${event.leagueId}');

    final result = await getDisciplineByLeagueUseCase(
      GetDisciplineByLeagueParams(
        leagueId: event.leagueId,
        limit: event.limit,
      ),
    );

    // Also fetch suspensions in parallel
    Map<String, SuspensionInfo> suspensions = {};
    final suspResult = await playerStatsRepository.getActiveSuspensionsByLeague(
      event.leagueId,
    );
    suspResult.fold(
      (failure) {
        logger.w('Could not fetch suspensions: ${failure.message}');
      },
      (data) {
        suspensions = data;
        logger.i('Loaded ${data.length} active suspensions');
      },
    );

    result.fold(
      (failure) {
        logger.e('Error loading discipline: ${failure.message}');
        emit(PlayerStatsError(failure.message));
      },
      (players) {
        logger.i('Loaded ${players.length} discipline entries');
        emit(DisciplineLoaded(players, suspensions: suspensions));
      },
    );
  }

  Future<void> _onLoadPlayerStatsById(
    LoadPlayerStatsByIdEvent event,
    Emitter<PlayerStatsState> emit,
  ) async {
    emit(const PlayerStatsLoading());
    logger.i('Loading stats for player: ${event.playerId}');

    final result = await getPlayerStatsByIdUseCase(
      GetPlayerStatsByIdParams(
        playerId: event.playerId,
        tournamentId: event.tournamentId,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error loading player stats: ${failure.message}');
        emit(PlayerStatsError(failure.message));
      },
      (stats) {
        logger.i('Loaded stats for player: ${stats?.playerName ?? 'no stats'}');
        emit(PlayerStatsByIdLoaded(stats));
      },
    );
  }

  Future<void> _onLoadPlayerMatchHistory(
    LoadPlayerMatchHistoryEvent event,
    Emitter<PlayerStatsState> emit,
  ) async {
    emit(const PlayerStatsLoading());
    logger.i('Loading match history for player: ${event.playerId}');

    // Fetch both aggregated stats and match history in parallel
    final results = await Future.wait([
      getPlayerStatsByIdUseCase(
        GetPlayerStatsByIdParams(playerId: event.playerId),
      ),
      getPlayerMatchHistoryUseCase(event.playerId),
    ]);

    final statsResult = results[0] as dynamic;
    final historyResult = results[1] as dynamic;

    PlayerStatsEntity? aggregated;
    statsResult.fold(
      (failure) => logger.w('Could not load aggregated stats: ${failure.message}'),
      (stats) => aggregated = stats,
    );

    historyResult.fold(
      (failure) {
        logger.e('Error loading match history: ${failure.message}');
        emit(PlayerStatsError(failure.message));
      },
      (history) {
        logger.i('Loaded ${history.length} match history entries');
        emit(PlayerMatchHistoryLoaded(history, aggregated: aggregated));
      },
    );
  }

  Future<void> _onResetState(
    ResetPlayerStatsEvent event,
    Emitter<PlayerStatsState> emit,
  ) async {
    emit(const PlayerStatsInitial());
  }

  Future<void> _onAddExtemporaneousGoals(
    AddExtemporaneousGoalsEvent event,
    Emitter<PlayerStatsState> emit,
  ) async {
    emit(const PlayerStatsLoading());
    logger.i('Adding extemporaneous goals for player: ${event.playerId}');

    final result = await playerStatsRepository.addExtemporaneousGoals(
      event.playerId,
      event.goals,
      event.assists,
    );

    result.fold(
      (failure) {
        logger.e('Error adding extemporaneous goals: ${failure.message}');
        emit(PlayerStatsError(failure.message));
      },
      (_) {
        logger.i('Successfully added extemporaneous goals');
        emit(const ExtemporaneousGoalsSaved());
        add(LoadTopScorersEvent(leagueId: event.leagueId));
      },
    );
  }

  Future<void> _onUpdateExtemporaneousGoals(
    UpdateExtemporaneousGoalsEvent event,
    Emitter<PlayerStatsState> emit,
  ) async {
    emit(const PlayerStatsLoading());
    logger.i('Updating extemporaneous goals for player: ${event.playerId}');

    final result = await playerStatsRepository.updateExtemporaneousGoals(
      event.playerId,
      event.newTotalGoals,
      event.newTotalAssists,
    );

    result.fold(
      (failure) {
        logger.e('Error updating extemporaneous goals: ${failure.message}');
        emit(PlayerStatsError(failure.message));
      },
      (_) {
        logger.i('Successfully updated extemporaneous goals');
        emit(const ExtemporaneousGoalsSaved());
        add(LoadTopScorersEvent(leagueId: event.leagueId));
      },
    );
  }

  Future<void> _onDeleteExtemporaneousGoals(
    DeleteExtemporaneousGoalsEvent event,
    Emitter<PlayerStatsState> emit,
  ) async {
    emit(const PlayerStatsLoading());
    logger.i('Deleting extemporaneous goals for player: ${event.playerId}');

    final result = await playerStatsRepository.deleteExtemporaneousGoals(
      event.playerId,
    );

    result.fold(
      (failure) {
        logger.e('Error deleting extemporaneous goals: ${failure.message}');
        emit(PlayerStatsError(failure.message));
      },
      (_) {
        logger.i('Successfully deleted extemporaneous goals');
        emit(const ExtemporaneousGoalsDeleted());
        add(LoadTopScorersEvent(leagueId: event.leagueId));
      },
    );
  }
}
