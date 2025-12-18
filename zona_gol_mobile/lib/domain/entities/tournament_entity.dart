import 'package:equatable/equatable.dart';

/// Tournament Entity
/// Represents a tournament in the domain layer
///
/// A tournament belongs to a league and has a specific format:
/// - league: Traditional round-robin format
/// - knockout: Single/double elimination
/// - group_knockout: Group stage + knockout (World Cup style)
class TournamentEntity extends Equatable {
  final String id;
  final String name;
  final String leagueId;
  final DateTime startDate;
  final DateTime endDate;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Configuration
  final int? maxPlayers;
  final int maxCoachingStaff;

  // Tournament Format
  final TournamentFormat format;
  final int? numberOfGroups; // For group_knockout (2-8)
  final int teamsAdvancingPerGroup; // For group_knockout (1-4)
  final int roundsPerSeason; // For league format (1-4)
  final bool hasThirdPlaceMatch; // For knockout

  const TournamentEntity({
    required this.id,
    required this.name,
    required this.leagueId,
    required this.startDate,
    required this.endDate,
    required this.isActive,
    this.createdAt,
    this.updatedAt,
    this.maxPlayers,
    this.maxCoachingStaff = 10,
    this.format = TournamentFormat.league,
    this.numberOfGroups,
    this.teamsAdvancingPerGroup = 2,
    this.roundsPerSeason = 1,
    this.hasThirdPlaceMatch = false,
  });

  @override
  List<Object?> get props => [
        id,
        name,
        leagueId,
        startDate,
        endDate,
        isActive,
        createdAt,
        updatedAt,
        maxPlayers,
        maxCoachingStaff,
        format,
        numberOfGroups,
        teamsAdvancingPerGroup,
        roundsPerSeason,
        hasThirdPlaceMatch,
      ];

  /// Check if the tournament belongs to a specific league
  bool belongsToLeague(String leagueId) => this.leagueId == leagueId;

  /// Get tournament status text
  String get statusText => isActive ? 'Activo' : 'Inactivo';

  /// Get tournament format text (Spanish)
  String get formatText {
    switch (format) {
      case TournamentFormat.league:
        return 'Liga';
      case TournamentFormat.knockout:
        return 'Eliminación';
      case TournamentFormat.groupKnockout:
        return 'Grupos + Eliminación';
    }
  }

  /// Get short format description
  String get formatDescription {
    switch (format) {
      case TournamentFormat.league:
        return roundsPerSeason == 1
            ? 'Todos contra todos (1 vuelta)'
            : 'Todos contra todos ($roundsPerSeason vueltas)';
      case TournamentFormat.knockout:
        return hasThirdPlaceMatch
            ? 'Eliminación directa con 3er lugar'
            : 'Eliminación directa';
      case TournamentFormat.groupKnockout:
        return numberOfGroups != null
            ? '$numberOfGroups grupos, clasifican $teamsAdvancingPerGroup por grupo'
            : 'Fase de grupos + eliminación';
    }
  }

  /// Check if tournament is currently active (between start and end dates)
  bool get isCurrentlyActive {
    if (!isActive) return false;
    final now = DateTime.now();
    return now.isAfter(startDate) && now.isBefore(endDate);
  }

  /// Check if tournament is upcoming
  bool get isUpcoming {
    final now = DateTime.now();
    return isActive && now.isBefore(startDate);
  }

  /// Check if tournament has finished
  bool get hasFinished {
    final now = DateTime.now();
    return now.isAfter(endDate);
  }

  /// Get tournament duration in days
  int get durationInDays => endDate.difference(startDate).inDays + 1;

  /// Get display name (tournament name)
  String get displayName => name;

  /// Check if max players limit is set
  bool get hasMaxPlayersLimit => maxPlayers != null;

  /// Copy with method for updates
  TournamentEntity copyWith({
    String? id,
    String? name,
    String? leagueId,
    DateTime? startDate,
    DateTime? endDate,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
    int? maxPlayers,
    int? maxCoachingStaff,
    TournamentFormat? format,
    int? numberOfGroups,
    int? teamsAdvancingPerGroup,
    int? roundsPerSeason,
    bool? hasThirdPlaceMatch,
  }) {
    return TournamentEntity(
      id: id ?? this.id,
      name: name ?? this.name,
      leagueId: leagueId ?? this.leagueId,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      maxPlayers: maxPlayers ?? this.maxPlayers,
      maxCoachingStaff: maxCoachingStaff ?? this.maxCoachingStaff,
      format: format ?? this.format,
      numberOfGroups: numberOfGroups ?? this.numberOfGroups,
      teamsAdvancingPerGroup:
          teamsAdvancingPerGroup ?? this.teamsAdvancingPerGroup,
      roundsPerSeason: roundsPerSeason ?? this.roundsPerSeason,
      hasThirdPlaceMatch: hasThirdPlaceMatch ?? this.hasThirdPlaceMatch,
    );
  }
}

/// Tournament Format Enum
enum TournamentFormat {
  league, // Round-robin format
  knockout, // Elimination format
  groupKnockout, // Group stage + knockout
}

/// Extension to convert string to TournamentFormat
extension TournamentFormatExtension on String {
  TournamentFormat toTournamentFormat() {
    switch (toLowerCase()) {
      case 'league':
        return TournamentFormat.league;
      case 'knockout':
        return TournamentFormat.knockout;
      case 'group_knockout':
        return TournamentFormat.groupKnockout;
      default:
        return TournamentFormat.league;
    }
  }
}

/// Extension to convert TournamentFormat to string
extension TournamentFormatToString on TournamentFormat {
  String toDbString() {
    switch (this) {
      case TournamentFormat.league:
        return 'league';
      case TournamentFormat.knockout:
        return 'knockout';
      case TournamentFormat.groupKnockout:
        return 'group_knockout';
    }
  }
}
