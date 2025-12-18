import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_model.freezed.dart';
part 'user_model.g.dart';

@freezed
class UserModel with _$UserModel {
  const UserModel._();

  const factory UserModel({
    required String id,
    required String email,
    String? name,
    @JsonKey(name: 'phone_number') String? phoneNumber,
    @JsonKey(name: 'profile_photo_url') String? profilePhotoUrl,
    @JsonKey(name: 'user_role') required String role,
    @JsonKey(name: 'league_id') String? leagueId,
    @JsonKey(name: 'team_id') String? teamId,
    @JsonKey(name: 'is_active') @Default(true) bool isActive,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _UserModel;

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);

  // Helper methods
  bool get isSuperAdmin => role == 'super_admin';
  bool get isLeagueAdmin => role == 'league_admin';
  bool get isTeamOwner => role == 'team_owner';
  bool get isPublic => role == 'public';

  String get displayName => name ?? email.split('@').first;

  bool get hasLeagueAccess => leagueId != null;
  bool get hasTeamAccess => teamId != null;

  // Check if user can access a specific league
  bool canAccessLeague(String checkLeagueId) {
    if (isSuperAdmin) return true;
    return leagueId == checkLeagueId;
  }

  // Check if user can access a specific team
  bool canAccessTeam(String checkTeamId) {
    if (isSuperAdmin || isLeagueAdmin) return true;
    return teamId == checkTeamId;
  }
}
