import 'package:equatable/equatable.dart';

/// Suspension status values
enum SuspensionStatus {
  active,
  completed,
  cancelled;

  String get display {
    switch (this) {
      case SuspensionStatus.active:
        return 'Activa';
      case SuspensionStatus.completed:
        return 'Completada';
      case SuspensionStatus.cancelled:
        return 'Cancelada';
    }
  }

  static SuspensionStatus fromString(String value) {
    switch (value) {
      case 'active':
        return SuspensionStatus.active;
      case 'completed':
        return SuspensionStatus.completed;
      case 'cancelled':
        return SuspensionStatus.cancelled;
      default:
        return SuspensionStatus.active;
    }
  }
}

/// Suspension type values
enum SuspensionType {
  redCard,
  yellowAccumulation,
  disciplinaryCommittee,
  other;

  String get dbValue {
    switch (this) {
      case SuspensionType.redCard:
        return 'red_card';
      case SuspensionType.yellowAccumulation:
        return 'yellow_accumulation';
      case SuspensionType.disciplinaryCommittee:
        return 'disciplinary_committee';
      case SuspensionType.other:
        return 'other';
    }
  }

  String get display {
    switch (this) {
      case SuspensionType.redCard:
        return 'Tarjeta Roja';
      case SuspensionType.yellowAccumulation:
        return 'Acumulaci\u00f3n Amarillas';
      case SuspensionType.disciplinaryCommittee:
        return 'Comit\u00e9 Disciplinario';
      case SuspensionType.other:
        return 'Otro';
    }
  }

  static SuspensionType fromString(String value) {
    switch (value) {
      case 'red_card':
        return SuspensionType.redCard;
      case 'yellow_accumulation':
        return SuspensionType.yellowAccumulation;
      case 'disciplinary_committee':
        return SuspensionType.disciplinaryCommittee;
      case 'other':
        return SuspensionType.other;
      default:
        return SuspensionType.other;
    }
  }
}

/// Suspension Entity
/// Represents a player suspension in the domain layer
class SuspensionEntity extends Equatable {
  final String id;
  final String playerId;
  final String teamId;
  final String leagueId;
  final String? tournamentId;
  final SuspensionType suspensionType;
  final String? reason;
  final int matchesToServe;
  final int matchesServed;
  final SuspensionStatus status;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Joined fields (from player + team)
  final String? playerName;
  final int? jerseyNumber;
  final String? teamName;

  const SuspensionEntity({
    required this.id,
    required this.playerId,
    required this.teamId,
    required this.leagueId,
    this.tournamentId,
    required this.suspensionType,
    this.reason,
    required this.matchesToServe,
    this.matchesServed = 0,
    this.status = SuspensionStatus.active,
    this.notes,
    this.createdAt,
    this.updatedAt,
    this.playerName,
    this.jerseyNumber,
    this.teamName,
  });

  @override
  List<Object?> get props => [
        id,
        playerId,
        teamId,
        leagueId,
        tournamentId,
        suspensionType,
        reason,
        matchesToServe,
        matchesServed,
        status,
        notes,
        createdAt,
        updatedAt,
        playerName,
        jerseyNumber,
        teamName,
      ];

  // Computed properties
  int get matchesRemaining {
    final remaining = matchesToServe - matchesServed;
    return remaining > 0 ? remaining : 0;
  }

  bool get isActive => status == SuspensionStatus.active && matchesRemaining > 0;

  bool get isCompleted =>
      status == SuspensionStatus.completed || matchesServed >= matchesToServe;

  String get progressDisplay => '$matchesServed/$matchesToServe';

  double get progressPercentage {
    if (matchesToServe == 0) return 100.0;
    return (matchesServed / matchesToServe) * 100;
  }

  String get suspensionSummary {
    if (isCompleted) {
      return 'Suspensi\u00f3n cumplida ($matchesToServe partidos)';
    }
    final remaining = matchesRemaining;
    if (remaining == 1) {
      return '1 partido restante';
    }
    return '$remaining partidos restantes';
  }

  String get displayName {
    if (playerName == null) return 'Jugador desconocido';
    if (jerseyNumber != null) return '#$jerseyNumber $playerName';
    return playerName!;
  }

  SuspensionEntity copyWith({
    String? id,
    String? playerId,
    String? teamId,
    String? leagueId,
    String? tournamentId,
    SuspensionType? suspensionType,
    String? reason,
    int? matchesToServe,
    int? matchesServed,
    SuspensionStatus? status,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? playerName,
    int? jerseyNumber,
    String? teamName,
  }) {
    return SuspensionEntity(
      id: id ?? this.id,
      playerId: playerId ?? this.playerId,
      teamId: teamId ?? this.teamId,
      leagueId: leagueId ?? this.leagueId,
      tournamentId: tournamentId ?? this.tournamentId,
      suspensionType: suspensionType ?? this.suspensionType,
      reason: reason ?? this.reason,
      matchesToServe: matchesToServe ?? this.matchesToServe,
      matchesServed: matchesServed ?? this.matchesServed,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      playerName: playerName ?? this.playerName,
      jerseyNumber: jerseyNumber ?? this.jerseyNumber,
      teamName: teamName ?? this.teamName,
    );
  }
}
