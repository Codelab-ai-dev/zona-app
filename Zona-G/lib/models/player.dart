class Player {
  final String id;
  final String name;
  final String teamId;
  final String position;
  final int jerseyNumber;
  final String? photo;
  final String? birthDate;
  final bool isActive;
  final DateTime createdAt;

  Player({
    required this.id,
    required this.name,
    required this.teamId,
    required this.position,
    required this.jerseyNumber,
    this.photo,
    this.birthDate,
    required this.isActive,
    required this.createdAt,
  });

  factory Player.fromJson(Map<String, dynamic> json) {
    return Player(
      id: json['id'],
      name: json['name'],
      teamId: json['team_id'],
      position: json['position'],
      jerseyNumber: json['jersey_number'],
      photo: json['photo'],
      birthDate: json['birth_date'],
      isActive: json['is_active'] ?? true,
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'team_id': teamId,
      'position': position,
      'jersey_number': jerseyNumber,
      'photo': photo,
      'birth_date': birthDate,
      'is_active': isActive,
      'created_at': createdAt.toIso8601String(),
    };
  }
}