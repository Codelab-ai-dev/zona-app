import 'package:freezed_annotation/freezed_annotation.dart';

part 'league_model.freezed.dart';
part 'league_model.g.dart';

@freezed
class LeagueModel with _$LeagueModel {
  const LeagueModel._();

  const factory LeagueModel({
    required String id,
    required String name,
    required String slug,
    required String description,
    String? logo,
    @JsonKey(name: 'admin_id') required String adminId,
    @JsonKey(name: 'is_active') @Default(true) bool isActive,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
    Map<String, dynamic>? features,
  }) = _LeagueModel;

  factory LeagueModel.fromJson(Map<String, dynamic> json) =>
      _$LeagueModelFromJson(json);

  // Helper methods
  String get displayName => name;

  bool get hasLogo => logo != null && logo!.isNotEmpty;

  String get statusText => isActive ? 'Activa' : 'Inactiva';
}
