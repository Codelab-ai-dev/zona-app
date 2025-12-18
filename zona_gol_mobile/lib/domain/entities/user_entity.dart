import 'package:equatable/equatable.dart';

/// User Entity (Domain Layer)
/// Represents the core user business object
class UserEntity extends Equatable {
  final String id;
  final String email;
  final String? name;
  final String role;
  final String? leagueId;
  final String? teamId;
  final String? avatarUrl;
  final DateTime? createdAt;

  const UserEntity({
    required this.id,
    required this.email,
    this.name,
    required this.role,
    this.leagueId,
    this.teamId,
    this.avatarUrl,
    this.createdAt,
  });

  // Business logic methods

  /// Check if user is super admin
  bool get isSuperAdmin => role == 'super_admin';

  /// Check if user is league admin
  bool get isLeagueAdmin => role == 'league_admin';

  /// Check if user is team owner
  bool get isTeamOwner => role == 'team_owner';

  /// Check if user is public
  bool get isPublic => role == 'public';

  /// Check if user has access to a specific league
  bool canAccessLeague(String checkLeagueId) {
    if (isSuperAdmin) return true;
    if (leagueId == null) return false;
    return leagueId == checkLeagueId;
  }

  /// Check if user has access to a specific team
  bool canAccessTeam(String checkTeamId) {
    if (isSuperAdmin) return true;
    if (teamId == null) return false;
    return teamId == checkTeamId;
  }

  /// Get display name (name or email)
  String get displayName => name ?? email;

  @override
  List<Object?> get props => [
        id,
        email,
        name,
        role,
        leagueId,
        teamId,
        avatarUrl,
        createdAt,
      ];
}
