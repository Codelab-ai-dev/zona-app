import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/utils/qr_service.dart';
import '../../../domain/repositories/attendance_repository.dart';
import '../../../domain/usecases/register_attendance_usecase.dart';
import 'attendance_event.dart';
import 'attendance_state.dart';

/// Scanner flow: scan QR -> player's matches today -> pick/confirm -> check-in.
class AttendanceBloc extends Bloc<AttendanceEvent, AttendanceState> {
  final RegisterAttendanceUseCase _registerAttendanceUseCase;
  final AttendanceRepository _attendanceRepository;

  /// The device's local date; replaceable in tests.
  final DateTime Function() _now;

  AttendanceBloc({
    required RegisterAttendanceUseCase registerAttendanceUseCase,
    required AttendanceRepository attendanceRepository,
    DateTime Function()? now,
  })  : _registerAttendanceUseCase = registerAttendanceUseCase,
        _attendanceRepository = attendanceRepository,
        _now = now ?? DateTime.now,
        super(AttendanceInitial()) {
    on<ScanQRCodeEvent>(_onScanQRCode);
    on<LoadTodayMatchesEvent>(_onLoadTodayMatches);
    on<SelectMatchEvent>(_onSelectMatch);
    on<RegisterAttendanceEvent>(_onRegisterAttendance);
    on<ResetScannerEvent>(_onResetScanner);
  }

  Future<void> _onScanQRCode(
    ScanQRCodeEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    final parsed = QRService.parseQRCode(event.qrData);
    if (parsed == null) {
      emit(const QRScanError(
          message: 'Código QR inválido. Intenta de nuevo.'));
      return;
    }
    await _onLoadTodayMatches(LoadTodayMatchesEvent(playerData: parsed), emit);
  }

  Future<void> _onLoadTodayMatches(
    LoadTodayMatchesEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    final player = event.playerData;
    emit(TodayMatchesLoading(playerData: player));

    final result =
        await _attendanceRepository.getTodayMatches(player.playerId, _now());

    result.fold(
      (failure) =>
          emit(TodayMatchesError(playerData: player, message: failure.message)),
      (matches) => emit(QRScanned(
        playerData: player,
        matches: matches,
        selectedMatchId: matches.length == 1 ? matches.first.matchId : null,
      )),
    );
  }

  void _onSelectMatch(SelectMatchEvent event, Emitter<AttendanceState> emit) {
    final current = state;
    if (current is QRScanned) {
      emit(current.copyWith(selectedMatchId: event.matchId));
    }
  }

  Future<void> _onRegisterAttendance(
    RegisterAttendanceEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    final current = state;
    if (current is! QRScanned) return;
    final match = current.selectedMatch;
    if (match == null || match.alreadyRegistered) return;

    emit(AttendanceRegistering(playerData: current.playerData, match: match));

    final result = await _registerAttendanceUseCase(
      RegisterAttendanceParams(
        playerId: current.playerData.playerId,
        matchId: match.matchId,
      ),
    );

    result.fold(
      (failure) => emit(current.copyWith(errorMessage: failure.message)),
      (outcome) => emit(AttendanceRegistered(
        playerData: current.playerData,
        match: match.copyWith(alreadyRegistered: true),
        alreadyRegistered: outcome == AttendanceResult.alreadyRegistered,
        registeredAt: _now(),
      )),
    );
  }

  void _onResetScanner(
    ResetScannerEvent event,
    Emitter<AttendanceState> emit,
  ) {
    emit(AttendanceInitial());
  }
}
