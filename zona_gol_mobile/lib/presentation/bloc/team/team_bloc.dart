import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';
import '../../../domain/usecases/create_team_usecase.dart';
import '../../../domain/usecases/create_team_owner_usecase.dart';
import '../../../domain/usecases/delete_team_usecase.dart';
import '../../../domain/usecases/get_standings_usecase.dart';
import '../../../domain/usecases/get_team_by_id_usecase.dart';
import '../../../domain/usecases/get_teams_by_league_usecase.dart';
import '../../../domain/usecases/get_teams_by_tournament_usecase.dart';
import '../../../domain/usecases/update_team_usecase.dart';
import '../../../domain/usecases/update_standings_usecase.dart';
import 'team_event.dart';
import 'team_state.dart';

/// Team BLoC
class TeamBloc extends Bloc<TeamEvent, TeamState> {
  final GetTeamsByLeagueUseCase getTeamsByLeagueUseCase;
  final GetTeamsByTournamentUseCase getTeamsByTournamentUseCase;
  final GetTeamByIdUseCase getTeamByIdUseCase;
  final GetStandingsByTournamentUseCase? getStandingsByTournamentUseCase;
  final CreateTeamUseCase? createTeamUseCase;
  final UpdateTeamUseCase? updateTeamUseCase;
  final DeleteTeamUseCase? deleteTeamUseCase;
  final CreateTeamOwnerUseCase? createTeamOwnerUseCase;
  final UpdateStandingsUseCase? updateStandingsUseCase;
  final Logger logger = Logger();

  TeamBloc({
    required this.getTeamsByLeagueUseCase,
    required this.getTeamsByTournamentUseCase,
    required this.getTeamByIdUseCase,
    this.getStandingsByTournamentUseCase,
    this.createTeamUseCase,
    this.updateTeamUseCase,
    this.deleteTeamUseCase,
    this.createTeamOwnerUseCase,
    this.updateStandingsUseCase,
  }) : super(const TeamInitial()) {
    on<LoadTeamsByLeagueEvent>(_onLoadTeamsByLeague);
    on<LoadTeamsByTournamentEvent>(_onLoadTeamsByTournament);
    on<LoadTeamByIdEvent>(_onLoadTeamById);
    on<ResetTeamEvent>(_onResetTeam);
    on<LoadStandingsByTournamentEvent>(_onLoadStandingsByTournament);
    on<CreateTeamEvent>(_onCreateTeam);
    on<CreateTeamWithOwnerEvent>(_onCreateTeamWithOwner);
    on<UpdateTeamEvent>(_onUpdateTeam);
    on<DeleteTeamEvent>(_onDeleteTeam);
    on<UpdateStandingsEvent>(_onUpdateStandings);
  }

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
        emit(TeamError(failure.message.isNotEmpty ? failure.message : 'Error al cargar equipos'));
      },
      (teams) {
        logger.i('Successfully loaded ${teams.length} teams for league');
        emit(TeamsLoaded(teams));
      },
    );
  }

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
        emit(TeamError(failure.message.isNotEmpty ? failure.message : 'Error al cargar equipos'));
      },
      (teams) {
        logger.i('Successfully loaded ${teams.length} teams for tournament');
        emit(TeamsLoaded(teams));
      },
    );
  }

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
        emit(TeamError(failure.message.isNotEmpty ? failure.message : 'Error al cargar equipo'));
      },
      (team) {
        logger.i('Successfully loaded team: ${team.name}');
        emit(TeamDetailLoaded(team));
      },
    );
  }

  Future<void> _onResetTeam(
    ResetTeamEvent event,
    Emitter<TeamState> emit,
  ) async {
    logger.i('Resetting team state');
    emit(const TeamInitial());
  }

  Future<void> _onLoadStandingsByTournament(
    LoadStandingsByTournamentEvent event,
    Emitter<TeamState> emit,
  ) async {
    if (getStandingsByTournamentUseCase == null) {
      emit(const TeamError('Función no disponible'));
      return;
    }

    emit(const TeamLoading());
    logger.i('Loading standings for tournament: ${event.tournamentId}');

    final result = await getStandingsByTournamentUseCase!(
      GetStandingsParams(tournamentId: event.tournamentId),
    );

    result.fold(
      (failure) {
        logger.e('Error loading standings: ${failure.message}');
        emit(TeamError(failure.message.isNotEmpty ? failure.message : 'Error al cargar tabla de posiciones'));
      },
      (standings) {
        logger.i('Successfully loaded ${standings.length} standings');
        emit(StandingsLoaded(standings, tournamentId: event.tournamentId));
      },
    );
  }

  Future<void> _onCreateTeam(
    CreateTeamEvent event,
    Emitter<TeamState> emit,
  ) async {
    if (createTeamUseCase == null) {
      emit(const TeamError('Función no disponible'));
      return;
    }

    emit(const TeamLoading());
    logger.i('Creating team: ${event.name}');

    final result = await createTeamUseCase!(
      CreateTeamParams(
        name: event.name,
        slug: event.slug,
        leagueId: event.leagueId,
        tournamentId: event.tournamentId,
        logo: event.logo,
        description: event.description,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error creating team: ${failure.message}');
        emit(TeamError(failure.message.isNotEmpty ? failure.message : 'Error al crear equipo'));
      },
      (team) {
        logger.i('Successfully created team: ${team.name}');
        emit(TeamCreated(team));
      },
    );
  }

  /// Creates the team (unless [CreateTeamWithOwnerEvent.existingTeamId] is
  /// set) and then its owner account. If the owner fails the team is kept and
  /// [TeamOwnerCreationFailed] carries its id to retry only the owner.
  Future<void> _onCreateTeamWithOwner(
    CreateTeamWithOwnerEvent event,
    Emitter<TeamState> emit,
  ) async {
    if (createTeamOwnerUseCase == null || createTeamUseCase == null) {
      emit(const TeamError('Función no disponible'));
      return;
    }

    emit(const TeamLoading());
    logger.i('Creating team with owner: ${event.teamName}');

    // Step 1: the team (or the one created in a previous attempt)
    final teamResult = event.existingTeamId != null
        ? await getTeamByIdUseCase(GetTeamParams(teamId: event.existingTeamId!))
        : await createTeamUseCase!(
            CreateTeamParams(
              name: event.teamName,
              slug: event.teamSlug,
              leagueId: event.leagueId,
              tournamentId: event.tournamentId,
              logo: event.logo,
              description: event.description,
            ),
          );

    final team = teamResult.fold((failure) {
      logger.e('Error creating team: ${failure.message}');
      emit(TeamError(failure.message.isNotEmpty ? failure.message : 'Error al crear equipo'));
      return null;
    }, (team) => team);
    if (team == null) return;

    // Step 2: the owner account, which becomes the team's owner
    final ownerResult = await createTeamOwnerUseCase!(
      CreateTeamOwnerParams(
        email: event.ownerEmail,
        name: event.ownerName,
        leagueId: event.leagueId,
        teamId: team.id,
      ),
    );

    ownerResult.fold(
      (failure) {
        logger.e('Error creating team owner: ${failure.message}');
        emit(TeamOwnerCreationFailed(
          teamId: team.id,
          message: failure.message.isNotEmpty ? failure.message : 'Error al crear cuenta de owner',
        ));
      },
      (owner) {
        logger.i('Successfully created team with owner: ${team.name}');
        emit(TeamCreatedWithOwner(
          team: team,
          ownerEmail: owner.email,
          ownerPassword: owner.password,
        ));
      },
    );
  }

  Future<void> _onUpdateTeam(
    UpdateTeamEvent event,
    Emitter<TeamState> emit,
  ) async {
    if (updateTeamUseCase == null) {
      emit(const TeamError('Función no disponible'));
      return;
    }

    emit(const TeamLoading());
    logger.i('Updating team: ${event.teamId}');

    final result = await updateTeamUseCase!(
      UpdateTeamParams(
        teamId: event.teamId,
        name: event.name,
        slug: event.slug,
        tournamentId: event.tournamentId,
        logo: event.logo,
        description: event.description,
        isActive: event.isActive,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error updating team: ${failure.message}');
        emit(TeamError(failure.message.isNotEmpty ? failure.message : 'Error al actualizar equipo'));
      },
      (team) {
        logger.i('Successfully updated team: ${team.name}');
        emit(TeamUpdated(team));
      },
    );
  }

  Future<void> _onDeleteTeam(
    DeleteTeamEvent event,
    Emitter<TeamState> emit,
  ) async {
    if (deleteTeamUseCase == null) {
      emit(const TeamError('Función no disponible'));
      return;
    }

    emit(const TeamLoading());
    logger.i('Deleting team: ${event.teamId}');

    final result = await deleteTeamUseCase!(
      DeleteTeamParams(teamId: event.teamId),
    );

    result.fold(
      (failure) {
        logger.e('Error deleting team: ${failure.message}');
        emit(TeamError(failure.message.isNotEmpty ? failure.message : 'Error al eliminar equipo'));
      },
      (_) {
        logger.i('Successfully deleted team');
        emit(TeamDeleted(event.teamId));
      },
    );
  }

  Future<void> _onUpdateStandings(
    UpdateStandingsEvent event,
    Emitter<TeamState> emit,
  ) async {
    if (updateStandingsUseCase == null) {
      emit(const TeamError('Función no disponible'));
      return;
    }

    emit(const TeamLoading());
    logger.i('Updating standings for team: ${event.teamId}');

    final result = await updateStandingsUseCase!(
      UpdateStandingsParams(
        teamId: event.teamId,
        tournamentId: event.tournamentId,
        matchesPlayed: event.matchesPlayed,
        matchesWon: event.matchesWon,
        matchesDrawn: event.matchesDrawn,
        matchesLost: event.matchesLost,
        goalsFor: event.goalsFor,
        goalsAgainst: event.goalsAgainst,
        pointsAdjustment: event.pointsAdjustment,
        adjustmentReason: event.adjustmentReason,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error updating standings: ${failure.message}');
        emit(TeamError(failure.message.isNotEmpty ? failure.message : 'Error al actualizar standings'));
      },
      (_) {
        logger.i('Successfully updated standings');
        emit(const StandingsUpdated());
      },
    );
  }
}
