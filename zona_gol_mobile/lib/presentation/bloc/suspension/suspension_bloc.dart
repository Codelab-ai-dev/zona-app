import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/usecases/cancel_suspension_usecase.dart';
import '../../../domain/usecases/complete_suspension_usecase.dart';
import '../../../domain/usecases/create_suspension_usecase.dart';
import '../../../domain/usecases/get_suspensions_by_league_usecase.dart';
import '../../../domain/usecases/update_suspension_usecase.dart';
import '../../../domain/repositories/suspension_repository.dart';
import 'suspension_event.dart';
import 'suspension_state.dart';

class SuspensionBloc extends Bloc<SuspensionEvent, SuspensionState> {
  final GetSuspensionsByLeagueUseCase _getSuspensionsByLeagueUseCase;
  final CreateSuspensionUseCase _createSuspensionUseCase;
  final CancelSuspensionUseCase _cancelSuspensionUseCase;
  final CompleteSuspensionUseCase _completeSuspensionUseCase;
  final UpdateSuspensionUseCase _updateSuspensionUseCase;
  final SuspensionRepository _suspensionRepository;

  SuspensionBloc({
    required GetSuspensionsByLeagueUseCase getSuspensionsByLeagueUseCase,
    required CreateSuspensionUseCase createSuspensionUseCase,
    required CancelSuspensionUseCase cancelSuspensionUseCase,
    required CompleteSuspensionUseCase completeSuspensionUseCase,
    required UpdateSuspensionUseCase updateSuspensionUseCase,
    required SuspensionRepository suspensionRepository,
  })  : _getSuspensionsByLeagueUseCase = getSuspensionsByLeagueUseCase,
        _createSuspensionUseCase = createSuspensionUseCase,
        _cancelSuspensionUseCase = cancelSuspensionUseCase,
        _completeSuspensionUseCase = completeSuspensionUseCase,
        _updateSuspensionUseCase = updateSuspensionUseCase,
        _suspensionRepository = suspensionRepository,
        super(SuspensionInitial()) {
    on<LoadSuspensionsEvent>(_onLoadSuspensions);
    on<CreateSuspensionEvent>(_onCreateSuspension);
    on<CancelSuspensionEvent>(_onCancelSuspension);
    on<CompleteSuspensionEvent>(_onCompleteSuspension);
    on<UpdateSuspensionEvent>(_onUpdateSuspension);
    on<ClearAllSuspensionsEvent>(_onClearAllSuspensions);
  }

  Future<void> _onLoadSuspensions(
    LoadSuspensionsEvent event,
    Emitter<SuspensionState> emit,
  ) async {
    emit(SuspensionLoading());

    final result =
        await _getSuspensionsByLeagueUseCase(event.leagueId);

    result.fold(
      (failure) => emit(SuspensionError(message: failure.message)),
      (suspensions) => emit(SuspensionLoaded(suspensions: suspensions)),
    );
  }

  Future<void> _onCreateSuspension(
    CreateSuspensionEvent event,
    Emitter<SuspensionState> emit,
  ) async {
    emit(SuspensionLoading());

    final result = await _createSuspensionUseCase(CreateSuspensionParams(
      playerId: event.playerId,
      teamId: event.teamId,
      leagueId: event.leagueId,
      suspensionType: event.suspensionType,
      reason: event.reason,
      matchesToServe: event.matchesToServe,
    ));

    await result.fold(
      (failure) async =>
          emit(SuspensionActionError(message: failure.message)),
      (suspension) async {
        emit(const SuspensionActionSuccess(
            message: 'Suspensi\u00f3n creada exitosamente'));
        // Reload list
        add(LoadSuspensionsEvent(leagueId: event.leagueId));
      },
    );
  }

  Future<void> _onCancelSuspension(
    CancelSuspensionEvent event,
    Emitter<SuspensionState> emit,
  ) async {
    final result = await _cancelSuspensionUseCase(event.suspensionId);

    await result.fold(
      (failure) async =>
          emit(SuspensionActionError(message: failure.message)),
      (_) async {
        emit(const SuspensionActionSuccess(
            message: 'Suspensi\u00f3n cancelada'));
        add(LoadSuspensionsEvent(leagueId: event.leagueId));
      },
    );
  }

  Future<void> _onCompleteSuspension(
    CompleteSuspensionEvent event,
    Emitter<SuspensionState> emit,
  ) async {
    final result = await _completeSuspensionUseCase(event.suspensionId);

    await result.fold(
      (failure) async =>
          emit(SuspensionActionError(message: failure.message)),
      (_) async {
        emit(const SuspensionActionSuccess(
            message: 'Suspensi\u00f3n completada'));
        add(LoadSuspensionsEvent(leagueId: event.leagueId));
      },
    );
  }

  Future<void> _onUpdateSuspension(
    UpdateSuspensionEvent event,
    Emitter<SuspensionState> emit,
  ) async {
    final result = await _updateSuspensionUseCase(UpdateSuspensionParams(
      suspensionId: event.suspensionId,
      matchesToServe: event.matchesToServe,
    ));

    await result.fold(
      (failure) async =>
          emit(SuspensionActionError(message: failure.message)),
      (_) async {
        emit(const SuspensionActionSuccess(
            message: 'Suspensi\u00f3n actualizada'));
        add(LoadSuspensionsEvent(leagueId: event.leagueId));
      },
    );
  }

  Future<void> _onClearAllSuspensions(
    ClearAllSuspensionsEvent event,
    Emitter<SuspensionState> emit,
  ) async {
    emit(SuspensionLoading());

    final result =
        await _suspensionRepository.clearAllSuspensions(event.leagueId);

    await result.fold(
      (failure) async =>
          emit(SuspensionActionError(message: failure.message)),
      (_) async {
        emit(const SuspensionActionSuccess(
            message: 'Todas las suspensiones eliminadas'));
        add(LoadSuspensionsEvent(leagueId: event.leagueId));
      },
    );
  }
}
