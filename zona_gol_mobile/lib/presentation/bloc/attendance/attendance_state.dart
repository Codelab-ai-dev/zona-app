import 'package:equatable/equatable.dart';
import '../../../domain/entities/attendance_entity.dart';

abstract class AttendanceState extends Equatable {
  const AttendanceState();

  @override
  List<Object?> get props => [];
}

class AttendanceInitial extends AttendanceState {}

/// QR code scan failed — invalid data
class QRScanError extends AttendanceState {
  final String message;

  const QRScanError({required this.message});

  @override
  List<Object?> get props => [message];
}

/// QR parsed; looking up the player's matches for today.
class TodayMatchesLoading extends AttendanceState {
  final QRPlayerData playerData;

  const TodayMatchesLoading({required this.playerData});

  @override
  List<Object?> get props => [playerData];
}

/// The matches lookup failed (network, permission...).
class TodayMatchesError extends AttendanceState {
  final QRPlayerData playerData;
  final String message;

  const TodayMatchesError({required this.playerData, required this.message});

  @override
  List<Object?> get props => [playerData, message];
}

/// QR parsed and matches loaded. [matches] may be empty (no match today);
/// with a single match it is preselected.
class QRScanned extends AttendanceState {
  final QRPlayerData playerData;
  final List<TodayMatchEntity> matches;
  final String? selectedMatchId;

  /// Last registration error, shown on the confirmation card.
  final String? errorMessage;

  const QRScanned({
    required this.playerData,
    required this.matches,
    this.selectedMatchId,
    this.errorMessage,
  });

  TodayMatchEntity? get selectedMatch {
    for (final m in matches) {
      if (m.matchId == selectedMatchId) return m;
    }
    return null;
  }

  bool get hasNoMatch => matches.isEmpty;

  QRScanned copyWith({String? selectedMatchId, String? errorMessage}) =>
      QRScanned(
        playerData: playerData,
        matches: matches,
        selectedMatchId: selectedMatchId ?? this.selectedMatchId,
        errorMessage: errorMessage,
      );

  @override
  List<Object?> get props => [playerData, matches, selectedMatchId, errorMessage];
}

/// Registering attendance in progress
class AttendanceRegistering extends AttendanceState {
  final QRPlayerData playerData;
  final TodayMatchEntity match;

  const AttendanceRegistering({required this.playerData, required this.match});

  @override
  List<Object?> get props => [playerData, match];
}

/// Check-in done. [alreadyRegistered] is true when the server reported the
/// player was already checked in for that match.
class AttendanceRegistered extends AttendanceState {
  final QRPlayerData playerData;
  final TodayMatchEntity match;
  final bool alreadyRegistered;
  final DateTime registeredAt;

  const AttendanceRegistered({
    required this.playerData,
    required this.match,
    required this.alreadyRegistered,
    required this.registeredAt,
  });

  String get registeredTimeDisplay =>
      '${registeredAt.hour.toString().padLeft(2, '0')}:${registeredAt.minute.toString().padLeft(2, '0')}';

  @override
  List<Object?> get props => [playerData, match, alreadyRegistered, registeredAt];
}
