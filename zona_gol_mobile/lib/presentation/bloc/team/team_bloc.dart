import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';
import '../../../domain/usecases/get_team_by_id_usecase.dart';
import '../../../domain/usecases/get_teams_by_league_usecase.dart';
import '../../../domain/usecases/get_teams_by_tournament_usecase.dart';
import 'team_event.dart';
import 'team_state.dart';

/// Team BLoC
/// Manages team state for the application
class TeamBloc extends Bloc<TeamEvent, TeamState> {
  final GetTeamsByLeagueUseCase getTeamsByLeagueUseCase;
  final GetTeamsByTournamentUseCase getTeamsByTournamentUseCase;
  final GetTeamByIdUseCase getTeamByIdUseCase;
  final Logger logger = Logger();

  TeamBloc({
    required this.getTeamsByLeagueUseCase,
    required this.getTeamsByTournamentUseCase,
    required this.getTeamByIdUseCase,
  }) : super(const TeamInitial()) {
    on<LoadTeamsByLeagueEvent>(_onLoadTeamsByLeague);
    on<LoadTeamsByTournamentEvent>(_onLoadTeamsByTournament);
    on<LoadTeamByIdEvent>(_onLoadTeamById);
    on<ResetTeamEvent>(_onResetTeam);
  }

  /// Load teams by league ID
  Future<void> _onLoadTeamsByLeague(
    LoadTeamsByLeagueEvent event,
    Emitter<TeamState> emit,
  ) async {
    emit(const TeamLoading());
    logger.i('Loading teams for league: ${event.leagueId}');

    final result = await getTeamsByLeagueUseCase(
      GetTeamsByLeagueParams(
        leagueId: event.leagueId,
        onlyActive: event.onlyActive,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error loading teams by league: ${failure.message}');
        emit(TeamError(failure.message ?? 'Error al cargar equipos'));
      },
      (teams) {
        logger.i('Successfully loaded ${teams.length} teams for league');
        emit(TeamsLoaded(teams));
      },
    );
  }

  /// Load teams by tournament ID
  Future<void> _onLoadTeamsByTournament(
    LoadTeamsByTournamentEvent event,
    Emitter<TeamState> emit,
  ) async {
    emit(const TeamLoading());
    logger.i('Loading teams for tournament: ${event.tournamentId}');

    final result = await getTeamsByTournamentUseCase(
      GetTeamsByTournamentParams(
        tournamentId: event.tournamentId,
        onlyActive: event.onlyActive,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error loading teams by tournament: ${failure.message}');
        emit(TeamError(failure.message ?? 'Error al cargar equipos'));
      },
      (teams) {
        logger.i('Successfully loaded ${teams.length} teams for tournament');
        emit(TeamsLoaded(teams));
      },
    );
  }

  /// Load team by ID
  Future<void> _onLoadTeamById(
    LoadTeamByIdEvent event,
    Emitter<TeamState> emit,
  ) async {
    emit(const TeamLoading());
    logger.i('Loading team: ${event.teamId}');

    final result = await getTeamByIdUseCase(
      GetTeamParams(teamId: event.teamId),
    );

    result.fold(
      (failure) {
        logger.e('Error loading team by ID: ${failure.message}');
        emit(TeamError(failure.message ?? 'Error al cargar equipo'));
      },
      (team) {
        logger.i('Successfully loaded team: ${team.name}');
        emit(TeamDetailLoaded(team));
      },
    );
  }

  /// Reset team state
  Future<void> _onResetTeam(
    ResetTeamEvent event,
    Emitter<TeamState> emit,
  ) async {
    logger.i('Resetting team state');
    emit(const TeamInitial());
  }
}
