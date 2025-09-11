class Tournament {
  final String id;
  final String name;
  final String leagueId;
  final String? leagueName;
  final DateTime startDate;
  final DateTime endDate;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  Tournament({
    required this.id,
    required this.name,
    required this.leagueId,
    this.leagueName,
    required this.startDate,
    required this.endDate,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Tournament.fromJson(Map<String, dynamic> json) {
    return Tournament(
      id: json['id'],
      name: json['name'],
      leagueId: json['league_id'],
      leagueName: json['league']?['name'],
      startDate: DateTime.parse(json['start_date']),
      endDate: DateTime.parse(json['end_date']),
      isActive: json['is_active'] ?? false,
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'league_id': leagueId,
      'start_date': startDate.toIso8601String().split('T')[0], // Only date part
      'end_date': endDate.toIso8601String().split('T')[0], // Only date part
      'is_active': isActive,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  bool get isOngoing {
    final now = DateTime.now();
    return now.isAfter(startDate) && now.isBefore(endDate.add(const Duration(days: 1)));
  }

  bool get isUpcoming {
    final now = DateTime.now();
    return now.isBefore(startDate);
  }

  bool get isFinished {
    final now = DateTime.now();
    return now.isAfter(endDate.add(const Duration(days: 1)));
  }

  String get statusText {
    if (isUpcoming) {
      return 'Próximo';
    } else if (isOngoing) {
      return 'En Curso';
    } else {
      return 'Finalizado';
    }
  }

  String get dateRangeText {
    final startFormatted = '${startDate.day}/${startDate.month}/${startDate.year}';
    final endFormatted = '${endDate.day}/${endDate.month}/${endDate.year}';
    return '$startFormatted - $endFormatted';
  }

  int get durationInDays {
    return endDate.difference(startDate).inDays + 1;
  }

  @override
  String toString() {
    return 'Tournament(id: $id, name: $name, leagueId: $leagueId, isActive: $isActive, status: $statusText)';
  }
}