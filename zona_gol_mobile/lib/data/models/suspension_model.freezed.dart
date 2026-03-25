// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'suspension_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

SuspensionModel _$SuspensionModelFromJson(Map<String, dynamic> json) {
  return _SuspensionModel.fromJson(json);
}

/// @nodoc
mixin _$SuspensionModel {
  String get id => throw _privateConstructorUsedError;
  @JsonKey(name: 'player_id')
  String get playerId => throw _privateConstructorUsedError;
  @JsonKey(name: 'team_id')
  String get teamId => throw _privateConstructorUsedError;
  @JsonKey(name: 'league_id')
  String get leagueId => throw _privateConstructorUsedError;
  @JsonKey(name: 'tournament_id')
  String? get tournamentId => throw _privateConstructorUsedError;
  @JsonKey(name: 'suspension_type')
  String get suspensionType => throw _privateConstructorUsedError;
  String? get reason => throw _privateConstructorUsedError;
  @JsonKey(name: 'matches_to_serve')
  int get matchesToServe => throw _privateConstructorUsedError;
  @JsonKey(name: 'matches_served')
  int get matchesServed => throw _privateConstructorUsedError;
  String get status =>
      throw _privateConstructorUsedError; // active, completed, cancelled
  String? get notes => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_at')
  DateTime? get createdAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $SuspensionModelCopyWith<SuspensionModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SuspensionModelCopyWith<$Res> {
  factory $SuspensionModelCopyWith(
          SuspensionModel value, $Res Function(SuspensionModel) then) =
      _$SuspensionModelCopyWithImpl<$Res, SuspensionModel>;
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'player_id') String playerId,
      @JsonKey(name: 'team_id') String teamId,
      @JsonKey(name: 'league_id') String leagueId,
      @JsonKey(name: 'tournament_id') String? tournamentId,
      @JsonKey(name: 'suspension_type') String suspensionType,
      String? reason,
      @JsonKey(name: 'matches_to_serve') int matchesToServe,
      @JsonKey(name: 'matches_served') int matchesServed,
      String status,
      String? notes,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt});
}

/// @nodoc
class _$SuspensionModelCopyWithImpl<$Res, $Val extends SuspensionModel>
    implements $SuspensionModelCopyWith<$Res> {
  _$SuspensionModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? playerId = null,
    Object? teamId = null,
    Object? leagueId = null,
    Object? tournamentId = freezed,
    Object? suspensionType = null,
    Object? reason = freezed,
    Object? matchesToServe = null,
    Object? matchesServed = null,
    Object? status = null,
    Object? notes = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      playerId: null == playerId
          ? _value.playerId
          : playerId // ignore: cast_nullable_to_non_nullable
              as String,
      teamId: null == teamId
          ? _value.teamId
          : teamId // ignore: cast_nullable_to_non_nullable
              as String,
      leagueId: null == leagueId
          ? _value.leagueId
          : leagueId // ignore: cast_nullable_to_non_nullable
              as String,
      tournamentId: freezed == tournamentId
          ? _value.tournamentId
          : tournamentId // ignore: cast_nullable_to_non_nullable
              as String?,
      suspensionType: null == suspensionType
          ? _value.suspensionType
          : suspensionType // ignore: cast_nullable_to_non_nullable
              as String,
      reason: freezed == reason
          ? _value.reason
          : reason // ignore: cast_nullable_to_non_nullable
              as String?,
      matchesToServe: null == matchesToServe
          ? _value.matchesToServe
          : matchesToServe // ignore: cast_nullable_to_non_nullable
              as int,
      matchesServed: null == matchesServed
          ? _value.matchesServed
          : matchesServed // ignore: cast_nullable_to_non_nullable
              as int,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SuspensionModelImplCopyWith<$Res>
    implements $SuspensionModelCopyWith<$Res> {
  factory _$$SuspensionModelImplCopyWith(_$SuspensionModelImpl value,
          $Res Function(_$SuspensionModelImpl) then) =
      __$$SuspensionModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'player_id') String playerId,
      @JsonKey(name: 'team_id') String teamId,
      @JsonKey(name: 'league_id') String leagueId,
      @JsonKey(name: 'tournament_id') String? tournamentId,
      @JsonKey(name: 'suspension_type') String suspensionType,
      String? reason,
      @JsonKey(name: 'matches_to_serve') int matchesToServe,
      @JsonKey(name: 'matches_served') int matchesServed,
      String status,
      String? notes,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt});
}

/// @nodoc
class __$$SuspensionModelImplCopyWithImpl<$Res>
    extends _$SuspensionModelCopyWithImpl<$Res, _$SuspensionModelImpl>
    implements _$$SuspensionModelImplCopyWith<$Res> {
  __$$SuspensionModelImplCopyWithImpl(
      _$SuspensionModelImpl _value, $Res Function(_$SuspensionModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? playerId = null,
    Object? teamId = null,
    Object? leagueId = null,
    Object? tournamentId = freezed,
    Object? suspensionType = null,
    Object? reason = freezed,
    Object? matchesToServe = null,
    Object? matchesServed = null,
    Object? status = null,
    Object? notes = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$SuspensionModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      playerId: null == playerId
          ? _value.playerId
          : playerId // ignore: cast_nullable_to_non_nullable
              as String,
      teamId: null == teamId
          ? _value.teamId
          : teamId // ignore: cast_nullable_to_non_nullable
              as String,
      leagueId: null == leagueId
          ? _value.leagueId
          : leagueId // ignore: cast_nullable_to_non_nullable
              as String,
      tournamentId: freezed == tournamentId
          ? _value.tournamentId
          : tournamentId // ignore: cast_nullable_to_non_nullable
              as String?,
      suspensionType: null == suspensionType
          ? _value.suspensionType
          : suspensionType // ignore: cast_nullable_to_non_nullable
              as String,
      reason: freezed == reason
          ? _value.reason
          : reason // ignore: cast_nullable_to_non_nullable
              as String?,
      matchesToServe: null == matchesToServe
          ? _value.matchesToServe
          : matchesToServe // ignore: cast_nullable_to_non_nullable
              as int,
      matchesServed: null == matchesServed
          ? _value.matchesServed
          : matchesServed // ignore: cast_nullable_to_non_nullable
              as int,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SuspensionModelImpl extends _SuspensionModel {
  const _$SuspensionModelImpl(
      {required this.id,
      @JsonKey(name: 'player_id') required this.playerId,
      @JsonKey(name: 'team_id') required this.teamId,
      @JsonKey(name: 'league_id') required this.leagueId,
      @JsonKey(name: 'tournament_id') this.tournamentId,
      @JsonKey(name: 'suspension_type') required this.suspensionType,
      this.reason,
      @JsonKey(name: 'matches_to_serve') this.matchesToServe = 1,
      @JsonKey(name: 'matches_served') this.matchesServed = 0,
      this.status = 'active',
      this.notes,
      @JsonKey(name: 'created_at') this.createdAt,
      @JsonKey(name: 'updated_at') this.updatedAt})
      : super._();

  factory _$SuspensionModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$SuspensionModelImplFromJson(json);

  @override
  final String id;
  @override
  @JsonKey(name: 'player_id')
  final String playerId;
  @override
  @JsonKey(name: 'team_id')
  final String teamId;
  @override
  @JsonKey(name: 'league_id')
  final String leagueId;
  @override
  @JsonKey(name: 'tournament_id')
  final String? tournamentId;
  @override
  @JsonKey(name: 'suspension_type')
  final String suspensionType;
  @override
  final String? reason;
  @override
  @JsonKey(name: 'matches_to_serve')
  final int matchesToServe;
  @override
  @JsonKey(name: 'matches_served')
  final int matchesServed;
  @override
  @JsonKey()
  final String status;
// active, completed, cancelled
  @override
  final String? notes;
  @override
  @JsonKey(name: 'created_at')
  final DateTime? createdAt;
  @override
  @JsonKey(name: 'updated_at')
  final DateTime? updatedAt;

  @override
  String toString() {
    return 'SuspensionModel(id: $id, playerId: $playerId, teamId: $teamId, leagueId: $leagueId, tournamentId: $tournamentId, suspensionType: $suspensionType, reason: $reason, matchesToServe: $matchesToServe, matchesServed: $matchesServed, status: $status, notes: $notes, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SuspensionModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.playerId, playerId) ||
                other.playerId == playerId) &&
            (identical(other.teamId, teamId) || other.teamId == teamId) &&
            (identical(other.leagueId, leagueId) ||
                other.leagueId == leagueId) &&
            (identical(other.tournamentId, tournamentId) ||
                other.tournamentId == tournamentId) &&
            (identical(other.suspensionType, suspensionType) ||
                other.suspensionType == suspensionType) &&
            (identical(other.reason, reason) || other.reason == reason) &&
            (identical(other.matchesToServe, matchesToServe) ||
                other.matchesToServe == matchesToServe) &&
            (identical(other.matchesServed, matchesServed) ||
                other.matchesServed == matchesServed) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.notes, notes) || other.notes == notes) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      playerId,
      teamId,
      leagueId,
      tournamentId,
      suspensionType,
      reason,
      matchesToServe,
      matchesServed,
      status,
      notes,
      createdAt,
      updatedAt);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$SuspensionModelImplCopyWith<_$SuspensionModelImpl> get copyWith =>
      __$$SuspensionModelImplCopyWithImpl<_$SuspensionModelImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SuspensionModelImplToJson(
      this,
    );
  }
}

abstract class _SuspensionModel extends SuspensionModel {
  const factory _SuspensionModel(
      {required final String id,
      @JsonKey(name: 'player_id') required final String playerId,
      @JsonKey(name: 'team_id') required final String teamId,
      @JsonKey(name: 'league_id') required final String leagueId,
      @JsonKey(name: 'tournament_id') final String? tournamentId,
      @JsonKey(name: 'suspension_type') required final String suspensionType,
      final String? reason,
      @JsonKey(name: 'matches_to_serve') final int matchesToServe,
      @JsonKey(name: 'matches_served') final int matchesServed,
      final String status,
      final String? notes,
      @JsonKey(name: 'created_at') final DateTime? createdAt,
      @JsonKey(name: 'updated_at')
      final DateTime? updatedAt}) = _$SuspensionModelImpl;
  const _SuspensionModel._() : super._();

  factory _SuspensionModel.fromJson(Map<String, dynamic> json) =
      _$SuspensionModelImpl.fromJson;

  @override
  String get id;
  @override
  @JsonKey(name: 'player_id')
  String get playerId;
  @override
  @JsonKey(name: 'team_id')
  String get teamId;
  @override
  @JsonKey(name: 'league_id')
  String get leagueId;
  @override
  @JsonKey(name: 'tournament_id')
  String? get tournamentId;
  @override
  @JsonKey(name: 'suspension_type')
  String get suspensionType;
  @override
  String? get reason;
  @override
  @JsonKey(name: 'matches_to_serve')
  int get matchesToServe;
  @override
  @JsonKey(name: 'matches_served')
  int get matchesServed;
  @override
  String get status;
  @override // active, completed, cancelled
  String? get notes;
  @override
  @JsonKey(name: 'created_at')
  DateTime? get createdAt;
  @override
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt;
  @override
  @JsonKey(ignore: true)
  _$$SuspensionModelImplCopyWith<_$SuspensionModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
