import 'package:freezed_annotation/freezed_annotation.dart';

part 'suspension_model.freezed.dart';
part 'suspension_model.g.dart';

@freezed
class SuspensionModel with _$SuspensionModel {
  const SuspensionModel._();

  const factory SuspensionModel({
    required String id,
    @JsonKey(name: 'player_id') required String playerId,
    @JsonKey(name: 'team_id') required String teamId,
    @JsonKey(name: 'league_id') required String leagueId,
    @JsonKey(name: 'tournament_id') String? tournamentId,
    @JsonKey(name: 'suspension_type') required String suspensionType,
    String? reason,
    @JsonKey(name: 'matches_to_serve') @Default(1) int matchesToServe,
    @JsonKey(name: 'matches_served') @Default(0) int matchesServed,
    @Default('active') String status, // active, completed, cancelled
    String? notes,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _SuspensionModel;

  factory SuspensionModel.fromJson(Map<String, dynamic> json) =>
      _$SuspensionModelFromJson(json);

  // Status helpers
  bool get isActive => status == 'active' && matchesRemaining > 0;
  bool get isCompleted => status == 'completed' || matchesServed >= matchesToServe;
  bool get isCancelled => status == 'cancelled';

  // Progress
  int get matchesRemaining {
    final remaining = matchesToServe - matchesServed;
    return remaining > 0 ? remaining : 0;
  }

  String get statusDisplay {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  }

  String get suspensionTypeDisplay {
    switch (suspensionType) {
      case 'red_card':
        return 'Tarjeta Roja';
      case 'yellow_accumulation':
        return 'Acumulaci\u00f3n Amarillas';
      case 'disciplinary_committee':
        return 'Comit\u00e9 Disciplinario';
      case 'other':
        return 'Otro';
      default:
        return suspensionType;
    }
  }
}
