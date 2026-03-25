import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/usecases/create_staff_usecase.dart';
import '../../../domain/usecases/delete_staff_usecase.dart';
import '../../../domain/usecases/get_staff_by_team_usecase.dart';
import '../../../domain/usecases/update_staff_usecase.dart';
import 'coaching_staff_event.dart';
import 'coaching_staff_state.dart';

class CoachingStaffBloc
    extends Bloc<CoachingStaffEvent, CoachingStaffState> {
  final GetStaffByTeamUseCase getStaffByTeamUseCase;
  final CreateStaffUseCase createStaffUseCase;
  final UpdateStaffUseCase updateStaffUseCase;
  final DeleteStaffUseCase deleteStaffUseCase;

  String? _currentTeamId;

  CoachingStaffBloc({
    required this.getStaffByTeamUseCase,
    required this.createStaffUseCase,
    required this.updateStaffUseCase,
    required this.deleteStaffUseCase,
  }) : super(const CoachingStaffInitial()) {
    on<LoadStaffByTeamEvent>(_onLoadStaff);
    on<CreateStaffEvent>(_onCreateStaff);
    on<UpdateStaffEvent>(_onUpdateStaff);
    on<DeleteStaffEvent>(_onDeleteStaff);
  }

  Future<void> _onLoadStaff(
    LoadStaffByTeamEvent event,
    Emitter<CoachingStaffState> emit,
  ) async {
    emit(const CoachingStaffLoading());
    _currentTeamId = event.teamId;

    final result = await getStaffByTeamUseCase(
      GetStaffByTeamParams(
        teamId: event.teamId,
        onlyActive: event.onlyActive,
      ),
    );

    result.fold(
      (failure) => emit(CoachingStaffError(failure.message)),
      (staff) => emit(CoachingStaffLoaded(staff)),
    );
  }

  Future<void> _onCreateStaff(
    CreateStaffEvent event,
    Emitter<CoachingStaffState> emit,
  ) async {
    emit(const CoachingStaffLoading());

    final result = await createStaffUseCase(
      CreateStaffParams(
        name: event.name,
        teamId: event.teamId,
        role: event.role,
        photo: event.photo,
        birthDate: event.birthDate,
        cedula: event.cedula,
      ),
    );

    result.fold(
      (failure) => emit(CoachingStaffError(failure.message)),
      (member) {
        emit(CoachingStaffCreated(member));
        // Reload list
        if (_currentTeamId != null) {
          add(LoadStaffByTeamEvent(teamId: _currentTeamId!));
        }
      },
    );
  }

  Future<void> _onUpdateStaff(
    UpdateStaffEvent event,
    Emitter<CoachingStaffState> emit,
  ) async {
    emit(const CoachingStaffLoading());

    final result = await updateStaffUseCase(
      UpdateStaffParams(
        staffId: event.staffId,
        name: event.name,
        role: event.role,
        photo: event.photo,
        birthDate: event.birthDate,
        cedula: event.cedula,
        isActive: event.isActive,
      ),
    );

    result.fold(
      (failure) => emit(CoachingStaffError(failure.message)),
      (member) {
        emit(CoachingStaffUpdated(member));
        if (_currentTeamId != null) {
          add(LoadStaffByTeamEvent(teamId: _currentTeamId!));
        }
      },
    );
  }

  Future<void> _onDeleteStaff(
    DeleteStaffEvent event,
    Emitter<CoachingStaffState> emit,
  ) async {
    emit(const CoachingStaffLoading());

    final result = await deleteStaffUseCase(
      DeleteStaffParams(staffId: event.staffId),
    );

    result.fold(
      (failure) => emit(CoachingStaffError(failure.message)),
      (_) {
        emit(CoachingStaffDeleted(event.staffId));
        if (_currentTeamId != null) {
          add(LoadStaffByTeamEvent(teamId: _currentTeamId!));
        }
      },
    );
  }
}
