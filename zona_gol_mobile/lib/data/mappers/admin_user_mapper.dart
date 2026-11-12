import '../../core/network/json.dart';
import '../../domain/entities/admin_user_entity.dart';

/// Maps `GET /users` rows (directory.User) and `/admin/users` responses.
class AdminUserMapper {
  static AdminUserEntity fromJson(Map<String, dynamic> json) => AdminUserEntity(
        id: json.str('id'),
        name: json.str('name'),
        email: json.str('email'),
        phone: json.strOrNull('phone'),
        role: json.str('role', 'public'),
        leagueId: json.strOrNull('league_id'),
        leagueName: json.strOrNull('league_name'),
        teamId: json.strOrNull('team_id'),
        teamName: json.strOrNull('team_name'),
        isActive: json.boolean('is_active', true),
        createdAt: json.dateOrNull('created_at'),
      );
}
