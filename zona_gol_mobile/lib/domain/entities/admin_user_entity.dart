import 'package:equatable/equatable.dart';

/// A user account as the super admin manages it (`GET /users`, `/admin/users`).
class AdminUserEntity extends Equatable {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String role;
  final String? leagueId;
  final String? leagueName;
  final String? teamId;
  final String? teamName;
  final bool isActive;
  final DateTime? createdAt;

  const AdminUserEntity({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    this.leagueId,
    this.leagueName,
    this.teamId,
    this.teamName,
    this.isActive = true,
    this.createdAt,
  });

  @override
  List<Object?> get props =>
      [id, name, email, phone, role, leagueId, leagueName, teamId, teamName, isActive, createdAt];
}
