import 'package:freezed_annotation/freezed_annotation.dart';

part 'suspension_model.freezed.dart';
part 'suspension_model.g.dart';

@freezed
class SuspensionModel with _$SuspensionModel {
  const SuspensionModel._();

  const factory SuspensionModel({
    required String id,
    @JsonKey(name: 'player_id') required String playerId,
    @JsonKey(name: 'tournament_id') required String tournamentId,
    @JsonKey(name: 'match_id') String? matchId,
    required String reason, // 'accumulation', 'red_card', 'disciplinary'
    @JsonKey(name: 'yellow_card_count') @Default(0) int yellowCardCount,
    @JsonKey(name: 'matches_suspended') @Default(1) int matchesSuspended,
    @JsonKey(name: 'matches_served') @Default(0) int matchesServed,
    @JsonKey(name: 'is_active') @Default(true) bool isActive,
    @JsonKey(name: 'suspended_at') required DateTime suspendedAt,
    @JsonKey(name: 'expires_at') DateTime? expiresAt,
    String? notes,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _SuspensionModel;

  factory SuspensionModel.fromJson(Map<String, dynamic> json) =>
      _$SuspensionModelFromJson(json);

  // Helper methods - Reason
  bool get isAccumulationSuspension => reason == 'accumulation';
  bool get isRedCardSuspension => reason == 'red_card';
  bool get isDisciplinarySuspension => reason == 'disciplinary';

  String get reasonDisplay {
    switch (reason) {
      case 'accumulation':
        return 'Acumulación de tarjetas';
      case 'red_card':
        return 'Tarjeta roja';
      case 'disciplinary':
        return 'Disciplinaria';
      default:
        return reason;
    }
  }

  // Suspension status
  int get matchesRemaining {
    final remaining = matchesSuspended - matchesServed;
    return remaining > 0 ? remaining : 0;
  }

  bool get isCompleted => matchesServed >= matchesSuspended;

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }

  bool get canPlay => !isActive || isCompleted || isExpired;

  String get statusDisplay {
    if (!isActive) return 'Inactiva';
    if (isCompleted) return 'Cumplida';
    if (isExpired) return 'Expirada';
    return 'Activa';
  }

  String get suspensionSummary {
    if (isCompleted) {
      return 'Suspensión cumplida ($matchesSuspended partidos)';
    }

    final remaining = matchesRemaining;
    if (remaining == 1) {
      return '1 partido de suspensión restante';
    }
    return '$remaining partidos de suspensión restantes';
  }

  // Display helpers
  String get fullDescription {
    final buffer = StringBuffer();
    buffer.write(reasonDisplay);

    if (yellowCardCount > 0) {
      buffer.write(' ($yellowCardCount amarillas)');
    }

    buffer.write(' - ');
    buffer.write(suspensionSummary);

    return buffer.toString();
  }

  double get progressPercentage {
    if (matchesSuspended == 0) return 100.0;
    return (matchesServed / matchesSuspended) * 100;
  }

  // Time helpers
  bool get isSuspendedToday {
    final now = DateTime.now();
    return suspendedAt.year == now.year &&
        suspendedAt.month == now.month &&
        suspendedAt.day == now.day;
  }

  String get suspendedAtDisplay {
    final date = suspendedAt;
    return '${date.day}/${date.month}/${date.year}';
  }
}
