import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/usecases/create_tournament_usecase.dart';
import '../../../domain/usecases/get_all_tournaments_usecase.dart';
import '../../../domain/usecases/get_tournament_by_id_usecase.dart';
import '../../../domain/usecases/get_tournaments_by_league_usecase.dart';
import 'tournament_event.dart';
import 'tournament_state.dart';

/// Tournament Bloc
/// Manages tournament state and handles tournament-related events
class TournamentBloc extends Bloc<TournamentEvent, TournamentState> {
  final GetAllTournamentsUseCase getAllTournamentsUseCase;
  final GetTournamentByIdUseCase getTournamentByIdUseCase;
  final GetTournamentsByLeagueUseCase getTournamentsByLeagueUseCase;
  final CreateTournamentUseCase createTournamentUseCase;

  TournamentBloc({
    required this.getAllTournamentsUseCase,
    required this.getTournamentByIdUseCase,
    required this.getTournamentsByLeagueUseCase,
    required this.createTournamentUseCase,
  }) : super(const TournamentInitial()) {
    on<LoadAllTournamentsEvent>(_onLoadAllTournaments);
    on<LoadTournamentByIdEvent>(_onLoadTournamentById);
    on<LoadTournamentsByLeagueEvent>(_onLoadTournamentsByLeague);
    on<CreateTournamentEvent>(_onCreateTournament);
    on<ResetTournamentStateEvent>(_onResetTournamentState);
  }

  /// Handle Load All Tournaments Event
  Future<void> _onLoadAllTournaments(
    LoadAllTournamentsEvent event,
    Emitter<TournamentState> emit,
  ) async {
    emit(const TournamentLoading());

    final result = await getAllTournamentsUseCase(onlyActive: event.onlyActive);

    result.fold(
      (failure) => emit(TournamentError(failure.message ?? 'Error desconocido')),
      (tournaments) => emit(TournamentsLoaded(tournaments)),
    );
  }

  /// Handle Load Tournament By ID Event
  Future<void> _onLoadTournamentById(
    LoadTournamentByIdEvent event,
    Emitter<TournamentState> emit,
  ) async {
    emit(const TournamentLoading());

    final result = await getTournamentByIdUseCase(
      GetTournamentParams(tournamentId: event.tournamentId),
    );

    result.fold(
      (failure) => emit(TournamentError(failure.message ?? 'Error desconocido')),
      (tournament) => emit(TournamentDetailLoaded(tournament)),
    );
  }

  /// Handle Load Tournaments By League Event
  Future<void> _onLoadTournamentsByLeague(
    LoadTournamentsByLeagueEvent event,
    Emitter<TournamentState> emit,
  ) async {
    emit(const TournamentLoading());

    final result = await getTournamentsByLeagueUseCase(
      GetTournamentsByLeagueParams(
        leagueId: event.leagueId,
        onlyActive: event.onlyActive,
      ),
    );

    result.fold(
      (failure) => emit(TournamentError(failure.message ?? 'Error desconocido')),
      (tournaments) => emit(TournamentsLoaded(tournaments)),
    );
  }

  /// Handle Create Tournament Event
  Future<void> _onCreateTournament(
    CreateTournamentEvent event,
    Emitter<TournamentState> emit,
  ) async {
    emit(const TournamentLoading());

    final result = await createTournamentUseCase(
      CreateTournamentParams(
        name: event.name,
        leagueId: event.leagueId,
        startDate: event.startDate,
        endDate: event.endDate,
        maxPlayers: event.maxPlayers,
        maxCoachingStaff: event.maxCoachingStaff,
        format: event.format,
        numberOfGroups: event.numberOfGroups,
        teamsAdvancingPerGroup: event.teamsAdvancingPerGroup,
        roundsPerSeason: event.roundsPerSeason,
        hasThirdPlaceMatch: event.hasThirdPlaceMatch,
      ),
    );

    result.fold(
      (failure) => emit(TournamentError(failure.message ?? 'Error desconocido')),
      (tournament) => emit(TournamentCreated(tournament)),
    );
  }

  /// Handle Reset Tournament State Event
  Future<void> _onResetTournamentState(
    ResetTournamentStateEvent event,
    Emitter<TournamentState> emit,
  ) async {
    emit(const TournamentInitial());
  }
}
