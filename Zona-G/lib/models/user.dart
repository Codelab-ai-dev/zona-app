enum UserRole { super_admin, league_admin, team_owner, public }

class AppUser {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final UserRole role;
  final String? leagueId;
  final String? teamId;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  AppUser({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    this.leagueId,
    this.teamId,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'],
      name: json['name'],
      email: json['email'],
      phone: json['phone'],
      role: _parseUserRole(json['role']),
      leagueId: json['league_id'],
      teamId: json['team_id'],
      isActive: json['is_active'] ?? true,
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'role': role.name,
      'league_id': leagueId,
      'team_id': teamId,
      'is_active': isActive,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  static UserRole _parseUserRole(String? role) {
    switch (role) {
      case 'super_admin':
        return UserRole.super_admin;
      case 'league_admin':
        return UserRole.league_admin;
      case 'team_owner':
        return UserRole.team_owner;
      case 'public':
      default:
        return UserRole.public;
    }
  }

  String get roleText {
    switch (role) {
      case UserRole.super_admin:
        return 'Super Administrador';
      case UserRole.league_admin:
        return 'Administrador de Liga';
      case UserRole.team_owner:
        return 'Propietario de Equipo';
      case UserRole.public:
        return 'Público';
    }
  }

  bool get isLeagueAdmin => role == UserRole.league_admin;
  bool get isSuperAdmin => role == UserRole.super_admin;
  bool get isTeamOwner => role == UserRole.team_owner;

  @override
  String toString() {
    return 'AppUser(id: $id, name: $name, email: $email, role: ${role.name})';
  }
}