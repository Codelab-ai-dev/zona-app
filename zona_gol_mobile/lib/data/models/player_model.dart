import 'package:freezed_annotation/freezed_annotation.dart';

part 'player_model.freezed.dart';
part 'player_model.g.dart';

@freezed
class PlayerModel with _$PlayerModel {
  const PlayerModel._();

  const factory PlayerModel({
    required String id,
    @JsonKey(name: 'team_id') required String teamId,
    @JsonKey(name: 'first_name') required String firstName,
    @JsonKey(name: 'last_name') required String lastName,
    @JsonKey(name: 'jersey_number') int? jerseyNumber,
    @JsonKey(name: 'photo_url') String? photoUrl,
    @JsonKey(name: 'date_of_birth') DateTime? dateOfBirth,
    String? position,
    String? email,
    @JsonKey(name: 'phone_number') String? phoneNumber,
    @JsonKey(name: 'is_active') @Default(true) bool isActive,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _PlayerModel;

  factory PlayerModel.fromJson(Map<String, dynamic> json) =>
      _$PlayerModelFromJson(json);

  // Helper methods
  String get fullName => '$firstName $lastName';

  String get displayName {
    if (jerseyNumber != null) {
      return '#$jerseyNumber $firstName $lastName';
    }
    return fullName;
  }

  String get initials {
    return '${firstName.isNotEmpty ? firstName[0] : ""}${lastName.isNotEmpty ? lastName[0] : ""}'.toUpperCase();
  }

  bool get hasPhoto => photoUrl != null && photoUrl!.isNotEmpty;
  bool get hasJerseyNumber => jerseyNumber != null;
  bool get hasPosition => position != null && position!.isNotEmpty;

  int? get age {
    if (dateOfBirth == null) return null;
    final now = DateTime.now();
    int age = now.year - dateOfBirth!.year;
    if (now.month < dateOfBirth!.month ||
        (now.month == dateOfBirth!.month && now.day < dateOfBirth!.day)) {
      age--;
    }
    return age;
  }

  String get positionDisplay {
    if (position == null || position!.isEmpty) return 'N/A';

    final positionMap = {
      'GK': 'Portero',
      'DEF': 'Defensa',
      'MID': 'Mediocampista',
      'FWD': 'Delantero',
      'goalkeeper': 'Portero',
      'defender': 'Defensa',
      'midfielder': 'Mediocampista',
      'forward': 'Delantero',
    };

    return positionMap[position] ?? position!;
  }
}
