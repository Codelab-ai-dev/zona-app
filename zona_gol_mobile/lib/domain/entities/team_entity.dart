import 'package:equatable/equatable.dart';

/// Team Entity
/// Represents a team in the domain layer
///
/// A team belongs to a league and can participate in tournaments
class TeamEntity extends Equatable {
  final String id;
  final String name;
  final String slug;
  final String leagueId;
  final String? tournamentId;
  final String ownerId;
  final String? logo;
  final String? description;
  final bool isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Uniform Colors (Home)
  final String? homePrimaryColor;
  final String? homeSecondaryColor;
  final String? homeAccentColor;

  // Uniform Colors (Away)
  final String? awayPrimaryColor;
  final String? awaySecondaryColor;
  final String? awayAccentColor;

  // Group for group_knockout tournaments
  final String? groupName;

  const TeamEntity({
    required this.id,
    required this.name,
    required this.slug,
    required this.leagueId,
    this.tournamentId,
    required this.ownerId,
    this.logo,
    this.description,
    required this.isActive,
    this.createdAt,
    this.updatedAt,
    this.homePrimaryColor,
    this.homeSecondaryColor,
    this.homeAccentColor,
    this.awayPrimaryColor,
    this.awaySecondaryColor,
    this.awayAccentColor,
    this.groupName,
  });

  @override
  List<Object?> get props => [
        id,
        name,
        slug,
        leagueId,
        tournamentId,
        ownerId,
        logo,
        description,
        isActive,
        createdAt,
        updatedAt,
        homePrimaryColor,
        homeSecondaryColor,
        homeAccentColor,
        awayPrimaryColor,
        awaySecondaryColor,
        awayAccentColor,
        groupName,
      ];

  /// Check if the team belongs to a specific league
  bool belongsToLeague(String leagueId) => this.leagueId == leagueId;

  /// Check if the team is owned by a specific user
  bool isOwnedBy(String userId) => ownerId == userId;

  /// Check if the team is participating in a tournament
  bool get isInTournament => tournamentId != null;

  /// Check if the team is in a group (for group_knockout tournaments)
  bool get isInGroup => groupName != null && groupName!.isNotEmpty;

  /// Get team status text
  String get statusText => isActive ? 'Activo' : 'Inactivo';

  /// Get display name (team name)
  String get displayName => name;

  /// Check if team has logo
  bool get hasLogo => logo != null && logo!.isNotEmpty;

  /// Check if team has home uniform colors
  bool get hasHomeColors => homePrimaryColor != null;

  /// Check if team has away uniform colors
  bool get hasAwayColors => awayPrimaryColor != null;

  /// Check if team has description
  bool get hasDescription => description != null && description!.isNotEmpty;

  /// Get group display text
  String get groupDisplayText => groupName != null ? 'Grupo $groupName' : 'Sin grupo';

  /// Copy with method for updates
  TeamEntity copyWith({
    String? id,
    String? name,
    String? slug,
    String? leagueId,
    String? tournamentId,
    String? ownerId,
    String? logo,
    String? description,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? homePrimaryColor,
    String? homeSecondaryColor,
    String? homeAccentColor,
    String? awayPrimaryColor,
    String? awaySecondaryColor,
    String? awayAccentColor,
    String? groupName,
  }) {
    return TeamEntity(
      id: id ?? this.id,
      name: name ?? this.name,
      slug: slug ?? this.slug,
      leagueId: leagueId ?? this.leagueId,
      tournamentId: tournamentId ?? this.tournamentId,
      ownerId: ownerId ?? this.ownerId,
      logo: logo ?? this.logo,
      description: description ?? this.description,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      homePrimaryColor: homePrimaryColor ?? this.homePrimaryColor,
      homeSecondaryColor: homeSecondaryColor ?? this.homeSecondaryColor,
      homeAccentColor: homeAccentColor ?? this.homeAccentColor,
      awayPrimaryColor: awayPrimaryColor ?? this.awayPrimaryColor,
      awaySecondaryColor: awaySecondaryColor ?? this.awaySecondaryColor,
      awayAccentColor: awayAccentColor ?? this.awayAccentColor,
      groupName: groupName ?? this.groupName,
    );
  }
}
