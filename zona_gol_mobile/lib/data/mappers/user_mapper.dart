import '../../core/network/json.dart';
import '../../domain/entities/user_entity.dart';

/// User Mapper: API profile (`GET /me`) and cache map <-> UserEntity.
class UserMapper {
  /// From the API profile (`id, name, email, phone, role, league_id, team_id, ...`).
  static UserEntity fromJson(Map<String, dynamic> json) => UserEntity(
        id: json.str('id'),
        email: json.str('email'),
        name: json.strOrNull('name'),
        role: json.str('role', 'public'),
        leagueId: json.strOrNull('league_id'),
        teamId: json.strOrNull('team_id'),
        createdAt: json.dateOrNull('created_at'),
      );

  /// From the cached map.
  static UserEntity fromMap(Map<String, dynamic> map) => fromJson(map);

  /// Convert UserEntity to map (for caching)
  static Map<String, dynamic> toMap(UserEntity user) {
    return {
      'id': user.id,
      'email': user.email,
      'name': user.name,
      'role': user.role,
      'league_id': user.leagueId,
      'team_id': user.teamId,
      'created_at': user.createdAt?.toIso8601String(),
    };
  }
}
