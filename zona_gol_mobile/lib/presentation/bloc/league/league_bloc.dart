import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/usecases/create_league_usecase.dart';
import '../../../domain/usecases/delete_league_usecase.dart';
import '../../../domain/usecases/get_all_leagues_usecase.dart';
import '../../../domain/usecases/get_league_by_id_usecase.dart';
import '../../../domain/usecases/update_league_usecase.dart';
import 'league_event.dart';
import 'league_state.dart';

/// League Bloc
/// Manages league state and handles league-related events
class LeagueBloc extends Bloc<LeagueEvent, LeagueState> {
  final GetAllLeaguesUseCase getAllLeaguesUseCase;
  final GetLeagueByIdUseCase getLeagueByIdUseCase;
  final CreateLeagueUseCase createLeagueUseCase;
  final UpdateLeagueUseCase updateLeagueUseCase;
  final DeleteLeagueUseCase deleteLeagueUseCase;

  LeagueBloc({
    required this.getAllLeaguesUseCase,
    required this.getLeagueByIdUseCase,
    required this.createLeagueUseCase,
    required this.updateLeagueUseCase,
    required this.deleteLeagueUseCase,
  }) : super(const LeagueInitial()) {
    on<LoadAllLeaguesEvent>(_onLoadAllLeagues);
    on<LoadLeagueByIdEvent>(_onLoadLeagueById);
    on<CreateLeagueEvent>(_onCreateLeague);
    on<UpdateLeagueEvent>(_onUpdateLeague);
    on<DeleteLeagueEvent>(_onDeleteLeague);
    on<ToggleLeagueStatusEvent>(_onToggleLeagueStatus);
    on<ResetLeagueStateEvent>(_onResetLeagueState);
  }

  /// Handle Load All Leagues Event
  Future<void> _onLoadAllLeagues(
    LoadAllLeaguesEvent event,
    Emitter<LeagueState> emit,
  ) async {
    emit(const LeagueLoading());

    final result = await getAllLeaguesUseCase(onlyActive: event.onlyActive);

    result.fold(
      (failure) => emit(LeagueError(failure.message)),
      (leagues) => emit(LeaguesLoaded(leagues)),
    );
  }

  /// Handle Load League By ID Event
  Future<void> _onLoadLeagueById(
    LoadLeagueByIdEvent event,
    Emitter<LeagueState> emit,
  ) async {
    emit(const LeagueLoading());

    final result = await getLeagueByIdUseCase(
      GetLeagueParams(leagueId: event.leagueId),
    );

    result.fold(
      (failure) => emit(LeagueError(failure.message)),
      (league) => emit(LeagueDetailLoaded(league)),
    );
  }

  /// Handle Create League Event
  Future<void> _onCreateLeague(
    CreateLeagueEvent event,
    Emitter<LeagueState> emit,
  ) async {
    emit(const LeagueLoading());

    final result = await createLeagueUseCase(
      CreateLeagueParams(
        name: event.name,
        slug: event.slug,
        description: event.description,
        adminId: event.adminId,
        logo: event.logo,
        productMode: event.productMode,
      ),
    );

    result.fold(
      (failure) => emit(LeagueError(failure.message)),
      (league) => emit(LeagueCreated(league)),
    );
  }

  /// Handle Reset League State Event
  Future<void> _onResetLeagueState(
    ResetLeagueStateEvent event,
    Emitter<LeagueState> emit,
  ) async {
    emit(const LeagueInitial());
  }

  /// Handle Update League Event
  Future<void> _onUpdateLeague(
    UpdateLeagueEvent event,
    Emitter<LeagueState> emit,
  ) async {
    emit(const LeagueLoading());

    final result = await updateLeagueUseCase(
      UpdateLeagueParams(
        leagueId: event.leagueId,
        name: event.name,
        slug: event.slug,
        description: event.description,
        logo: event.logo,
        isActive: event.isActive,
      ),
    );

    result.fold(
      (failure) => emit(LeagueError(failure.message)),
      (league) => emit(LeagueUpdated(league)),
    );
  }

  /// Handle Delete League Event
  Future<void> _onDeleteLeague(
    DeleteLeagueEvent event,
    Emitter<LeagueState> emit,
  ) async {
    emit(const LeagueLoading());

    final result = await deleteLeagueUseCase(
      DeleteLeagueParams(leagueId: event.leagueId),
    );

    result.fold(
      (failure) => emit(LeagueError(failure.message)),
      (_) => emit(LeagueDeleted(event.leagueId)),
    );
  }

  /// Handle Toggle League Status Event
  Future<void> _onToggleLeagueStatus(
    ToggleLeagueStatusEvent event,
    Emitter<LeagueState> emit,
  ) async {
    emit(const LeagueLoading());

    final result = await updateLeagueUseCase(
      UpdateLeagueParams(
        leagueId: event.leagueId,
        isActive: !event.currentStatus,
      ),
    );

    result.fold(
      (failure) => emit(LeagueError(failure.message)),
      (league) => emit(LeagueStatusToggled(league)),
    );
  }
}
