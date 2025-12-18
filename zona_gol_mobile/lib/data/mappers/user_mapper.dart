import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/user_entity.dart';

/// User Mapper
/// Converts between Supabase User and UserEntity
class UserMapper {
  /// Convert Supabase User to UserEntity
  ///
  /// Fetches additional user data from the users table in Supabase
  static Future<UserEntity> fromSupabaseUser(
    User supabaseUser,
    SupabaseClient client,
  ) async {
    try {
      // Fetch user profile from users table
      final response = await client
          .from('users')
          .select()
          .eq('id', supabaseUser.id)
          .single();

      return UserEntity(
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        name: response['name'] as String?,
        role: response['role'] as String? ?? 'public',
        leagueId: response['league_id'] as String?,
        teamId: response['team_id'] as String?,
        avatarUrl: null, // Avatar URL not in database schema yet
        createdAt: supabaseUser.createdAt != null
            ? DateTime.parse(supabaseUser.createdAt!)
            : null,
      );
    } catch (e) {
      // If user profile doesn't exist in users table, return basic info
      return UserEntity(
        id: supabaseUser.id,
        email: supabaseUser.email ?? '',
        name: supabaseUser.userMetadata?['name'] as String?,
        role: 'public', // Default role
        createdAt: supabaseUser.createdAt != null
            ? DateTime.parse(supabaseUser.createdAt!)
            : null,
      );
    }
  }

  /// Convert map to UserEntity (from cached data)
  static UserEntity fromMap(Map<String, dynamic> map) {
    return UserEntity(
      id: map['id'] as String,
      email: map['email'] as String,
      name: map['name'] as String?,
      role: map['role'] as String,
      leagueId: map['league_id'] as String?,
      teamId: map['team_id'] as String?,
      avatarUrl: map['avatar_url'] as String?,
      createdAt: map['created_at'] != null
          ? DateTime.parse(map['created_at'] as String)
          : null,
    );
  }

  /// Convert UserEntity to map (for caching)
  static Map<String, dynamic> toMap(UserEntity user) {
    return {
      'id': user.id,
      'email': user.email,
      'name': user.name,
      'role': user.role,
      'league_id': user.leagueId,
      'team_id': user.teamId,
      'avatar_url': user.avatarUrl,
      'created_at': user.createdAt?.toIso8601String(),
    };
  }
}
