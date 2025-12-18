// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'team_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

TeamModel _$TeamModelFromJson(Map<String, dynamic> json) {
  return _TeamModel.fromJson(json);
}

/// @nodoc
mixin _$TeamModel {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get slug => throw _privateConstructorUsedError;
  @JsonKey(name: 'league_id')
  String get leagueId => throw _privateConstructorUsedError;
  @JsonKey(name: 'tournament_id')
  String? get tournamentId => throw _privateConstructorUsedError;
  @JsonKey(name: 'owner_id')
  String get ownerId => throw _privateConstructorUsedError;
  String? get logo => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  @JsonKey(name: 'is_active')
  bool get isActive => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_at')
  DateTime? get createdAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt =>
      throw _privateConstructorUsedError; // Uniform Colors
  @JsonKey(name: 'home_primary_color')
  String? get homePrimaryColor => throw _privateConstructorUsedError;
  @JsonKey(name: 'home_secondary_color')
  String? get homeSecondaryColor => throw _privateConstructorUsedError;
  @JsonKey(name: 'home_accent_color')
  String? get homeAccentColor => throw _privateConstructorUsedError;
  @JsonKey(name: 'away_primary_color')
  String? get awayPrimaryColor => throw _privateConstructorUsedError;
  @JsonKey(name: 'away_secondary_color')
  String? get awaySecondaryColor => throw _privateConstructorUsedError;
  @JsonKey(name: 'away_accent_color')
  String? get awayAccentColor =>
      throw _privateConstructorUsedError; // Group for tournaments
  @JsonKey(name: 'group_name')
  String? get groupName => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TeamModelCopyWith<TeamModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TeamModelCopyWith<$Res> {
  factory $TeamModelCopyWith(TeamModel value, $Res Function(TeamModel) then) =
      _$TeamModelCopyWithImpl<$Res, TeamModel>;
  @useResult
  $Res call(
      {String id,
      String name,
      String slug,
      @JsonKey(name: 'league_id') String leagueId,
      @JsonKey(name: 'tournament_id') String? tournamentId,
      @JsonKey(name: 'owner_id') String ownerId,
      String? logo,
      String? description,
      @JsonKey(name: 'is_active') bool isActive,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt,
      @JsonKey(name: 'home_primary_color') String? homePrimaryColor,
      @JsonKey(name: 'home_secondary_color') String? homeSecondaryColor,
      @JsonKey(name: 'home_accent_color') String? homeAccentColor,
      @JsonKey(name: 'away_primary_color') String? awayPrimaryColor,
      @JsonKey(name: 'away_secondary_color') String? awaySecondaryColor,
      @JsonKey(name: 'away_accent_color') String? awayAccentColor,
      @JsonKey(name: 'group_name') String? groupName});
}

/// @nodoc
class _$TeamModelCopyWithImpl<$Res, $Val extends TeamModel>
    implements $TeamModelCopyWith<$Res> {
  _$TeamModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? slug = null,
    Object? leagueId = null,
    Object? tournamentId = freezed,
    Object? ownerId = null,
    Object? logo = freezed,
    Object? description = freezed,
    Object? isActive = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? homePrimaryColor = freezed,
    Object? homeSecondaryColor = freezed,
    Object? homeAccentColor = freezed,
    Object? awayPrimaryColor = freezed,
    Object? awaySecondaryColor = freezed,
    Object? awayAccentColor = freezed,
    Object? groupName = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      slug: null == slug
          ? _value.slug
          : slug // ignore: cast_nullable_to_non_nullable
              as String,
      leagueId: null == leagueId
          ? _value.leagueId
          : leagueId // ignore: cast_nullable_to_non_nullable
              as String,
      tournamentId: freezed == tournamentId
          ? _value.tournamentId
          : tournamentId // ignore: cast_nullable_to_non_nullable
              as String?,
      ownerId: null == ownerId
          ? _value.ownerId
          : ownerId // ignore: cast_nullable_to_non_nullable
              as String,
      logo: freezed == logo
          ? _value.logo
          : logo // ignore: cast_nullable_to_non_nullable
              as String?,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      homePrimaryColor: freezed == homePrimaryColor
          ? _value.homePrimaryColor
          : homePrimaryColor // ignore: cast_nullable_to_non_nullable
              as String?,
      homeSecondaryColor: freezed == homeSecondaryColor
          ? _value.homeSecondaryColor
          : homeSecondaryColor // ignore: cast_nullable_to_non_nullable
              as String?,
      homeAccentColor: freezed == homeAccentColor
          ? _value.homeAccentColor
          : homeAccentColor // ignore: cast_nullable_to_non_nullable
              as String?,
      awayPrimaryColor: freezed == awayPrimaryColor
          ? _value.awayPrimaryColor
          : awayPrimaryColor // ignore: cast_nullable_to_non_nullable
              as String?,
      awaySecondaryColor: freezed == awaySecondaryColor
          ? _value.awaySecondaryColor
          : awaySecondaryColor // ignore: cast_nullable_to_non_nullable
              as String?,
      awayAccentColor: freezed == awayAccentColor
          ? _value.awayAccentColor
          : awayAccentColor // ignore: cast_nullable_to_non_nullable
              as String?,
      groupName: freezed == groupName
          ? _value.groupName
          : groupName // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TeamModelImplCopyWith<$Res>
    implements $TeamModelCopyWith<$Res> {
  factory _$$TeamModelImplCopyWith(
          _$TeamModelImpl value, $Res Function(_$TeamModelImpl) then) =
      __$$TeamModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      String slug,
      @JsonKey(name: 'league_id') String leagueId,
      @JsonKey(name: 'tournament_id') String? tournamentId,
      @JsonKey(name: 'owner_id') String ownerId,
      String? logo,
      String? description,
      @JsonKey(name: 'is_active') bool isActive,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt,
      @JsonKey(name: 'home_primary_color') String? homePrimaryColor,
      @JsonKey(name: 'home_secondary_color') String? homeSecondaryColor,
      @JsonKey(name: 'home_accent_color') String? homeAccentColor,
      @JsonKey(name: 'away_primary_color') String? awayPrimaryColor,
      @JsonKey(name: 'away_secondary_color') String? awaySecondaryColor,
      @JsonKey(name: 'away_accent_color') String? awayAccentColor,
      @JsonKey(name: 'group_name') String? groupName});
}

/// @nodoc
class __$$TeamModelImplCopyWithImpl<$Res>
    extends _$TeamModelCopyWithImpl<$Res, _$TeamModelImpl>
    implements _$$TeamModelImplCopyWith<$Res> {
  __$$TeamModelImplCopyWithImpl(
      _$TeamModelImpl _value, $Res Function(_$TeamModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? slug = null,
    Object? leagueId = null,
    Object? tournamentId = freezed,
    Object? ownerId = null,
    Object? logo = freezed,
    Object? description = freezed,
    Object? isActive = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? homePrimaryColor = freezed,
    Object? homeSecondaryColor = freezed,
    Object? homeAccentColor = freezed,
    Object? awayPrimaryColor = freezed,
    Object? awaySecondaryColor = freezed,
    Object? awayAccentColor = freezed,
    Object? groupName = freezed,
  }) {
    return _then(_$TeamModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      slug: null == slug
          ? _value.slug
          : slug // ignore: cast_nullable_to_non_nullable
              as String,
      leagueId: null == leagueId
          ? _value.leagueId
          : leagueId // ignore: cast_nullable_to_non_nullable
              as String,
      tournamentId: freezed == tournamentId
          ? _value.tournamentId
          : tournamentId // ignore: cast_nullable_to_non_nullable
              as String?,
      ownerId: null == ownerId
          ? _value.ownerId
          : ownerId // ignore: cast_nullable_to_non_nullable
              as String,
      logo: freezed == logo
          ? _value.logo
          : logo // ignore: cast_nullable_to_non_nullable
              as String?,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      homePrimaryColor: freezed == homePrimaryColor
          ? _value.homePrimaryColor
          : homePrimaryColor // ignore: cast_nullable_to_non_nullable
              as String?,
      homeSecondaryColor: freezed == homeSecondaryColor
          ? _value.homeSecondaryColor
          : homeSecondaryColor // ignore: cast_nullable_to_non_nullable
              as String?,
      homeAccentColor: freezed == homeAccentColor
          ? _value.homeAccentColor
          : homeAccentColor // ignore: cast_nullable_to_non_nullable
              as String?,
      awayPrimaryColor: freezed == awayPrimaryColor
          ? _value.awayPrimaryColor
          : awayPrimaryColor // ignore: cast_nullable_to_non_nullable
              as String?,
      awaySecondaryColor: freezed == awaySecondaryColor
          ? _value.awaySecondaryColor
          : awaySecondaryColor // ignore: cast_nullable_to_non_nullable
              as String?,
      awayAccentColor: freezed == awayAccentColor
          ? _value.awayAccentColor
          : awayAccentColor // ignore: cast_nullable_to_non_nullable
              as String?,
      groupName: freezed == groupName
          ? _value.groupName
          : groupName // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TeamModelImpl extends _TeamModel {
  const _$TeamModelImpl(
      {required this.id,
      required this.name,
      required this.slug,
      @JsonKey(name: 'league_id') required this.leagueId,
      @JsonKey(name: 'tournament_id') this.tournamentId,
      @JsonKey(name: 'owner_id') required this.ownerId,
      this.logo,
      this.description,
      @JsonKey(name: 'is_active') this.isActive = true,
      @JsonKey(name: 'created_at') this.createdAt,
      @JsonKey(name: 'updated_at') this.updatedAt,
      @JsonKey(name: 'home_primary_color') this.homePrimaryColor,
      @JsonKey(name: 'home_secondary_color') this.homeSecondaryColor,
      @JsonKey(name: 'home_accent_color') this.homeAccentColor,
      @JsonKey(name: 'away_primary_color') this.awayPrimaryColor,
      @JsonKey(name: 'away_secondary_color') this.awaySecondaryColor,
      @JsonKey(name: 'away_accent_color') this.awayAccentColor,
      @JsonKey(name: 'group_name') this.groupName})
      : super._();

  factory _$TeamModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$TeamModelImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  final String slug;
  @override
  @JsonKey(name: 'league_id')
  final String leagueId;
  @override
  @JsonKey(name: 'tournament_id')
  final String? tournamentId;
  @override
  @JsonKey(name: 'owner_id')
  final String ownerId;
  @override
  final String? logo;
  @override
  final String? description;
  @override
  @JsonKey(name: 'is_active')
  final bool isActive;
  @override
  @JsonKey(name: 'created_at')
  final DateTime? createdAt;
  @override
  @JsonKey(name: 'updated_at')
  final DateTime? updatedAt;
// Uniform Colors
  @override
  @JsonKey(name: 'home_primary_color')
  final String? homePrimaryColor;
  @override
  @JsonKey(name: 'home_secondary_color')
  final String? homeSecondaryColor;
  @override
  @JsonKey(name: 'home_accent_color')
  final String? homeAccentColor;
  @override
  @JsonKey(name: 'away_primary_color')
  final String? awayPrimaryColor;
  @override
  @JsonKey(name: 'away_secondary_color')
  final String? awaySecondaryColor;
  @override
  @JsonKey(name: 'away_accent_color')
  final String? awayAccentColor;
// Group for tournaments
  @override
  @JsonKey(name: 'group_name')
  final String? groupName;

  @override
  String toString() {
    return 'TeamModel(id: $id, name: $name, slug: $slug, leagueId: $leagueId, tournamentId: $tournamentId, ownerId: $ownerId, logo: $logo, description: $description, isActive: $isActive, createdAt: $createdAt, updatedAt: $updatedAt, homePrimaryColor: $homePrimaryColor, homeSecondaryColor: $homeSecondaryColor, homeAccentColor: $homeAccentColor, awayPrimaryColor: $awayPrimaryColor, awaySecondaryColor: $awaySecondaryColor, awayAccentColor: $awayAccentColor, groupName: $groupName)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TeamModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.slug, slug) || other.slug == slug) &&
            (identical(other.leagueId, leagueId) ||
                other.leagueId == leagueId) &&
            (identical(other.tournamentId, tournamentId) ||
                other.tournamentId == tournamentId) &&
            (identical(other.ownerId, ownerId) || other.ownerId == ownerId) &&
            (identical(other.logo, logo) || other.logo == logo) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt) &&
            (identical(other.homePrimaryColor, homePrimaryColor) ||
                other.homePrimaryColor == homePrimaryColor) &&
            (identical(other.homeSecondaryColor, homeSecondaryColor) ||
                other.homeSecondaryColor == homeSecondaryColor) &&
            (identical(other.homeAccentColor, homeAccentColor) ||
                other.homeAccentColor == homeAccentColor) &&
            (identical(other.awayPrimaryColor, awayPrimaryColor) ||
                other.awayPrimaryColor == awayPrimaryColor) &&
            (identical(other.awaySecondaryColor, awaySecondaryColor) ||
                other.awaySecondaryColor == awaySecondaryColor) &&
            (identical(other.awayAccentColor, awayAccentColor) ||
                other.awayAccentColor == awayAccentColor) &&
            (identical(other.groupName, groupName) ||
                other.groupName == groupName));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      name,
      slug,
      leagueId,
      tournamentId,
      ownerId,
      logo,
      description,
      isActive,
      createdAt,
      updatedAt,
      homePrimaryColor,
      homeSecondaryColor,
      homeAccentColor,
      awayPrimaryColor,
      awaySecondaryColor,
      awayAccentColor,
      groupName);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TeamModelImplCopyWith<_$TeamModelImpl> get copyWith =>
      __$$TeamModelImplCopyWithImpl<_$TeamModelImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TeamModelImplToJson(
      this,
    );
  }
}

abstract class _TeamModel extends TeamModel {
  const factory _TeamModel(
      {required final String id,
      required final String name,
      required final String slug,
      @JsonKey(name: 'league_id') required final String leagueId,
      @JsonKey(name: 'tournament_id') final String? tournamentId,
      @JsonKey(name: 'owner_id') required final String ownerId,
      final String? logo,
      final String? description,
      @JsonKey(name: 'is_active') final bool isActive,
      @JsonKey(name: 'created_at') final DateTime? createdAt,
      @JsonKey(name: 'updated_at') final DateTime? updatedAt,
      @JsonKey(name: 'home_primary_color') final String? homePrimaryColor,
      @JsonKey(name: 'home_secondary_color') final String? homeSecondaryColor,
      @JsonKey(name: 'home_accent_color') final String? homeAccentColor,
      @JsonKey(name: 'away_primary_color') final String? awayPrimaryColor,
      @JsonKey(name: 'away_secondary_color') final String? awaySecondaryColor,
      @JsonKey(name: 'away_accent_color') final String? awayAccentColor,
      @JsonKey(name: 'group_name') final String? groupName}) = _$TeamModelImpl;
  const _TeamModel._() : super._();

  factory _TeamModel.fromJson(Map<String, dynamic> json) =
      _$TeamModelImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  String get slug;
  @override
  @JsonKey(name: 'league_id')
  String get leagueId;
  @override
  @JsonKey(name: 'tournament_id')
  String? get tournamentId;
  @override
  @JsonKey(name: 'owner_id')
  String get ownerId;
  @override
  String? get logo;
  @override
  String? get description;
  @override
  @JsonKey(name: 'is_active')
  bool get isActive;
  @override
  @JsonKey(name: 'created_at')
  DateTime? get createdAt;
  @override
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt;
  @override // Uniform Colors
  @JsonKey(name: 'home_primary_color')
  String? get homePrimaryColor;
  @override
  @JsonKey(name: 'home_secondary_color')
  String? get homeSecondaryColor;
  @override
  @JsonKey(name: 'home_accent_color')
  String? get homeAccentColor;
  @override
  @JsonKey(name: 'away_primary_color')
  String? get awayPrimaryColor;
  @override
  @JsonKey(name: 'away_secondary_color')
  String? get awaySecondaryColor;
  @override
  @JsonKey(name: 'away_accent_color')
  String? get awayAccentColor;
  @override // Group for tournaments
  @JsonKey(name: 'group_name')
  String? get groupName;
  @override
  @JsonKey(ignore: true)
  _$$TeamModelImplCopyWith<_$TeamModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
