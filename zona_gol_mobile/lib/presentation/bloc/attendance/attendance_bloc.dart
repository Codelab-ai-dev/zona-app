import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/utils/qr_service.dart';
import '../../../domain/repositories/attendance_repository.dart';
import '../../../domain/usecases/register_attendance_usecase.dart';
import '../../../domain/usecases/get_match_attendance_usecase.dart';
import 'attendance_event.dart';
import 'attendance_state.dart';

class AttendanceBloc extends Bloc<AttendanceEvent, AttendanceState> {
  final RegisterAttendanceUseCase _registerAttendanceUseCase;
  final GetMatchAttendanceUseCase _getMatchAttendanceUseCase;
  final AttendanceRepository _attendanceRepository;

  AttendanceBloc({
    required RegisterAttendanceUseCase registerAttendanceUseCase,
    required GetMatchAttendanceUseCase getMatchAttendanceUseCase,
    required AttendanceRepository attendanceRepository,
  })  : _registerAttendanceUseCase = registerAttendanceUseCase,
        _getMatchAttendanceUseCase = getMatchAttendanceUseCase,
        _attendanceRepository = attendanceRepository,
        super(AttendanceInitial()) {
    on<ScanQRCodeEvent>(_onScanQRCode);
    on<RegisterAttendanceEvent>(_onRegisterAttendance);
    on<CheckAttendanceEvent>(_onCheckAttendance);
    on<LoadMatchAttendanceEvent>(_onLoadMatchAttendance);
    on<ResetScannerEvent>(_onResetScanner);
  }

  Future<void> _onScanQRCode(
    ScanQRCodeEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    final parsed = QRService.parseQRCode(event.qrData);
    if (parsed == null) {
      emit(const QRScanError(
          message: 'C\u00f3digo QR inv\u00e1lido. Intenta de nuevo.'));
      return;
    }
    emit(QRScanned(playerData: parsed));
  }

  Future<void> _onCheckAttendance(
    CheckAttendanceEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    if (event.matchId != null) {
      final result = await _attendanceRepository.hasAttendanceForMatch(
          event.playerId, event.matchId!);
      result.fold(
        (_) {}, // Ignore errors for check
        (hasAttendance) {
          if (state is QRScanned) {
            final current = state as QRScanned;
            emit(QRScanned(
              playerData: current.playerData,
              alreadyCheckedIn: hasAttendance,
            ));
          }
        },
      );
    } else {
      final result =
          await _attendanceRepository.hasAttendanceToday(event.playerId);
      result.fold(
        (_) {},
        (hasAttendance) {
          if (state is QRScanned) {
            final current = state as QRScanned;
            emit(QRScanned(
              playerData: current.playerData,
              alreadyCheckedIn: hasAttendance,
            ));
          }
        },
      );
    }
  }

  Future<void> _onRegisterAttendance(
    RegisterAttendanceEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceRegistering());

    final result = await _registerAttendanceUseCase(
      RegisterAttendanceParams(
        playerId: event.playerData.playerId,
        teamId: event.playerData.teamId,
        matchId: event.matchId,
        scannedByUserId: event.scannedByUserId,
      ),
    );

    result.fold(
      (failure) =>
          emit(AttendanceRegisterError(message: failure.message)),
      (attendance) =>
          emit(AttendanceRegistered(attendance: attendance)),
    );
  }

  Future<void> _onLoadMatchAttendance(
    LoadMatchAttendanceEvent event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(MatchAttendanceLoading());

    final result = await _getMatchAttendanceUseCase(event.matchId);

    result.fold(
      (failure) =>
          emit(MatchAttendanceError(message: failure.message)),
      (records) =>
          emit(MatchAttendanceLoaded(records: records)),
    );
  }

  void _onResetScanner(
    ResetScannerEvent event,
    Emitter<AttendanceState> emit,
  ) {
    emit(AttendanceInitial());
  }
}
