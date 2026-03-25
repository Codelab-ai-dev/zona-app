import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';
import '../../../domain/usecases/create_player_usecase.dart';
import '../../../domain/usecases/delete_player_usecase.dart';
import '../../../domain/usecases/get_player_by_id_usecase.dart';
import '../../../domain/usecases/get_players_by_league_usecase.dart';
import '../../../domain/usecases/get_players_by_team_usecase.dart';
import '../../../domain/usecases/update_player_usecase.dart';
import '../../../domain/usecases/verify_player_usecase.dart';
import 'player_event.dart';
import 'player_state.dart';

/// Player BLoC
/// Manages player state for the application
class PlayerBloc extends Bloc<PlayerEvent, PlayerState> {
  final GetPlayersByTeamUseCase getPlayersByTeamUseCase;
  final GetPlayerByIdUseCase getPlayerByIdUseCase;
  final CreatePlayerUseCase createPlayerUseCase;
  final UpdatePlayerUseCase updatePlayerUseCase;
  final DeletePlayerUseCase deletePlayerUseCase;
  final GetPlayersByLeagueUseCase? getPlayersByLeagueUseCase;
  final VerifyPlayerUseCase? verifyPlayerUseCase;
  final Logger logger = Logger();

  PlayerBloc({
    required this.getPlayersByTeamUseCase,
    required this.getPlayerByIdUseCase,
    required this.createPlayerUseCase,
    required this.updatePlayerUseCase,
    required this.deletePlayerUseCase,
    this.getPlayersByLeagueUseCase,
    this.verifyPlayerUseCase,
  }) : super(const PlayerInitial()) {
    on<LoadPlayersByTeamEvent>(_onLoadPlayersByTeam);
    on<LoadPlayerByIdEvent>(_onLoadPlayerById);
    on<CreatePlayerEvent>(_onCreatePlayer);
    on<UpdatePlayerEvent>(_onUpdatePlayer);
    on<DeletePlayerEvent>(_onDeletePlayer);
    on<ResetPlayerStateEvent>(_onResetState);
    on<LoadPlayersByLeagueEvent>(_onLoadPlayersByLeague);
    on<VerifyPlayerEvent>(_onVerifyPlayer);
  }

  Future<void> _onLoadPlayersByTeam(
    LoadPlayersByTeamEvent event,
    Emitter<PlayerState> emit,
  ) async {
    emit(const PlayerLoading());
    logger.i('Loading players for team: ${event.teamId}');

    final result = await getPlayersByTeamUseCase(
      GetPlayersByTeamParams(
        teamId: event.teamId,
        onlyActive: event.onlyActive,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error loading players: ${failure.message}');
        emit(PlayerError(failure.message));
      },
      (players) {
        logger.i('Successfully loaded ${players.length} players');
        emit(PlayersLoaded(players));
      },
    );
  }

  Future<void> _onLoadPlayerById(
    LoadPlayerByIdEvent event,
    Emitter<PlayerState> emit,
  ) async {
    emit(const PlayerLoading());
    logger.i('Loading player: ${event.playerId}');

    final result = await getPlayerByIdUseCase(
      GetPlayerByIdParams(playerId: event.playerId),
    );

    result.fold(
      (failure) {
        logger.e('Error loading player: ${failure.message}');
        emit(PlayerError(failure.message));
      },
      (player) {
        logger.i('Successfully loaded player: ${player.name}');
        emit(PlayerDetailLoaded(player));
      },
    );
  }

  Future<void> _onCreatePlayer(
    CreatePlayerEvent event,
    Emitter<PlayerState> emit,
  ) async {
    emit(const PlayerLoading());
    logger.i('Creating player: ${event.name}');

    final result = await createPlayerUseCase(
      CreatePlayerParams(
        name: event.name,
        teamId: event.teamId,
        position: event.position,
        jerseyNumber: event.jerseyNumber,
        photo: event.photo,
        birthDate: event.birthDate,
        idDocumentUrl: event.idDocumentUrl,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error creating player: ${failure.message}');
        emit(PlayerError(failure.message));
      },
      (player) {
        logger.i('Successfully created player: ${player.name}');
        emit(PlayerCreated(player));
      },
    );
  }

  Future<void> _onUpdatePlayer(
    UpdatePlayerEvent event,
    Emitter<PlayerState> emit,
  ) async {
    emit(const PlayerLoading());
    logger.i('Updating player: ${event.playerId}');

    final result = await updatePlayerUseCase(
      UpdatePlayerParams(
        playerId: event.playerId,
        name: event.name,
        position: event.position,
        jerseyNumber: event.jerseyNumber,
        photo: event.photo,
        birthDate: event.birthDate,
        isActive: event.isActive,
        idDocumentUrl: event.idDocumentUrl,
        idVerified: event.idVerified,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error updating player: ${failure.message}');
        emit(PlayerError(failure.message));
      },
      (player) {
        logger.i('Successfully updated player: ${player.name}');
        emit(PlayerUpdated(player));
      },
    );
  }

  Future<void> _onDeletePlayer(
    DeletePlayerEvent event,
    Emitter<PlayerState> emit,
  ) async {
    emit(const PlayerLoading());
    logger.i('Deleting player: ${event.playerId}');

    final result = await deletePlayerUseCase(
      DeletePlayerParams(playerId: event.playerId),
    );

    result.fold(
      (failure) {
        logger.e('Error deleting player: ${failure.message}');
        emit(PlayerError(failure.message));
      },
      (_) {
        logger.i('Successfully deleted player');
        emit(PlayerDeleted(event.playerId));
      },
    );
  }

  Future<void> _onResetState(
    ResetPlayerStateEvent event,
    Emitter<PlayerState> emit,
  ) async {
    emit(const PlayerInitial());
  }

  Future<void> _onLoadPlayersByLeague(
    LoadPlayersByLeagueEvent event,
    Emitter<PlayerState> emit,
  ) async {
    if (getPlayersByLeagueUseCase == null) {
      emit(const PlayerError('Función no disponible'));
      return;
    }

    emit(const PlayerLoading());
    logger.i('Loading players for league: ${event.leagueId}');

    final result = await getPlayersByLeagueUseCase!(
      GetPlayersByLeagueParams(
        leagueId: event.leagueId,
        idVerified: event.idVerified,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error loading league players: ${failure.message}');
        emit(PlayerError(failure.message));
      },
      (players) {
        logger.i('Successfully loaded ${players.length} league players');
        emit(LeaguePlayersLoaded(players));
      },
    );
  }

  Future<void> _onVerifyPlayer(
    VerifyPlayerEvent event,
    Emitter<PlayerState> emit,
  ) async {
    if (verifyPlayerUseCase == null) {
      emit(const PlayerError('Función no disponible'));
      return;
    }

    emit(const PlayerLoading());
    logger.i('Verifying player: ${event.playerId} -> ${event.verified}');

    final result = await verifyPlayerUseCase!(
      VerifyPlayerParams(
        playerId: event.playerId,
        verified: event.verified,
      ),
    );

    result.fold(
      (failure) {
        logger.e('Error verifying player: ${failure.message}');
        emit(PlayerError(failure.message));
      },
      (player) {
        logger.i('Successfully verified player: ${player.name}');
        emit(PlayerVerified(player));
      },
    );
  }
}
