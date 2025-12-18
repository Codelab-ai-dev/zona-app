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
  @JsonKey(name: 'tournament_id')
  String get tournamentId => throw _privateConstructorUsedError;
  @JsonKey(name: 'match_id')
  String? get matchId => throw _privateConstructorUsedError;
  String get reason =>
      throw _privateConstructorUsedError; // 'accumulation', 'red_card', 'disciplinary'
  @JsonKey(name: 'yellow_card_count')
  int get yellowCardCount => throw _privateConstructorUsedError;
  @JsonKey(name: 'matches_suspended')
  int get matchesSuspended => throw _privateConstructorUsedError;
  @JsonKey(name: 'matches_served')
  int get matchesServed => throw _privateConstructorUsedError;
  @JsonKey(name: 'is_active')
  bool get isActive => throw _privateConstructorUsedError;
  @JsonKey(name: 'suspended_at')
  DateTime get suspendedAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'expires_at')
  DateTime? get expiresAt => throw _privateConstructorUsedError;
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
      @JsonKey(name: 'tournament_id') String tournamentId,
      @JsonKey(name: 'match_id') String? matchId,
      String reason,
      @JsonKey(name: 'yellow_card_count') int yellowCardCount,
      @JsonKey(name: 'matches_suspended') int matchesSuspended,
      @JsonKey(name: 'matches_served') int matchesServed,
      @JsonKey(name: 'is_active') bool isActive,
      @JsonKey(name: 'suspended_at') DateTime suspendedAt,
      @JsonKey(name: 'expires_at') DateTime? expiresAt,
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
    Object? tournamentId = null,
    Object? matchId = freezed,
    Object? reason = null,
    Object? yellowCardCount = null,
    Object? matchesSuspended = null,
    Object? matchesServed = null,
    Object? isActive = null,
    Object? suspendedAt = null,
    Object? expiresAt = freezed,
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
      tournamentId: null == tournamentId
          ? _value.tournamentId
          : tournamentId // ignore: cast_nullable_to_non_nullable
              as String,
      matchId: freezed == matchId
          ? _value.matchId
          : matchId // ignore: cast_nullable_to_non_nullable
              as String?,
      reason: null == reason
          ? _value.reason
          : reason // ignore: cast_nullable_to_non_nullable
              as String,
      yellowCardCount: null == yellowCardCount
          ? _value.yellowCardCount
          : yellowCardCount // ignore: cast_nullable_to_non_nullable
              as int,
      matchesSuspended: null == matchesSuspended
          ? _value.matchesSuspended
          : matchesSuspended // ignore: cast_nullable_to_non_nullable
              as int,
      matchesServed: null == matchesServed
          ? _value.matchesServed
          : matchesServed // ignore: cast_nullable_to_non_nullable
              as int,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      suspendedAt: null == suspendedAt
          ? _value.suspendedAt
          : suspendedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      expiresAt: freezed == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
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
      @JsonKey(name: 'tournament_id') String tournamentId,
      @JsonKey(name: 'match_id') String? matchId,
      String reason,
      @JsonKey(name: 'yellow_card_count') int yellowCardCount,
      @JsonKey(name: 'matches_suspended') int matchesSuspended,
      @JsonKey(name: 'matches_served') int matchesServed,
      @JsonKey(name: 'is_active') bool isActive,
      @JsonKey(name: 'suspended_at') DateTime suspendedAt,
      @JsonKey(name: 'expires_at') DateTime? expiresAt,
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
    Object? tournamentId = null,
    Object? matchId = freezed,
    Object? reason = null,
    Object? yellowCardCount = null,
    Object? matchesSuspended = null,
    Object? matchesServed = null,
    Object? isActive = null,
    Object? suspendedAt = null,
    Object? expiresAt = freezed,
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
      tournamentId: null == tournamentId
          ? _value.tournamentId
          : tournamentId // ignore: cast_nullable_to_non_nullable
              as String,
      matchId: freezed == matchId
          ? _value.matchId
          : matchId // ignore: cast_nullable_to_non_nullable
              as String?,
      reason: null == reason
          ? _value.reason
          : reason // ignore: cast_nullable_to_non_nullable
              as String,
      yellowCardCount: null == yellowCardCount
          ? _value.yellowCardCount
          : yellowCardCount // ignore: cast_nullable_to_non_nullable
              as int,
      matchesSuspended: null == matchesSuspended
          ? _value.matchesSuspended
          : matchesSuspended // ignore: cast_nullable_to_non_nullable
              as int,
      matchesServed: null == matchesServed
          ? _value.matchesServed
          : matchesServed // ignore: cast_nullable_to_non_nullable
              as int,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      suspendedAt: null == suspendedAt
          ? _value.suspendedAt
          : suspendedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      expiresAt: freezed == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
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
      @JsonKey(name: 'tournament_id') required this.tournamentId,
      @JsonKey(name: 'match_id') this.matchId,
      required this.reason,
      @JsonKey(name: 'yellow_card_count') this.yellowCardCount = 0,
      @JsonKey(name: 'matches_suspended') this.matchesSuspended = 1,
      @JsonKey(name: 'matches_served') this.matchesServed = 0,
      @JsonKey(name: 'is_active') this.isActive = true,
      @JsonKey(name: 'suspended_at') required this.suspendedAt,
      @JsonKey(name: 'expires_at') this.expiresAt,
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
  @JsonKey(name: 'tournament_id')
  final String tournamentId;
  @override
  @JsonKey(name: 'match_id')
  final String? matchId;
  @override
  final String reason;
// 'accumulation', 'red_card', 'disciplinary'
  @override
  @JsonKey(name: 'yellow_card_count')
  final int yellowCardCount;
  @override
  @JsonKey(name: 'matches_suspended')
  final int matchesSuspended;
  @override
  @JsonKey(name: 'matches_served')
  final int matchesServed;
  @override
  @JsonKey(name: 'is_active')
  final bool isActive;
  @override
  @JsonKey(name: 'suspended_at')
  final DateTime suspendedAt;
  @override
  @JsonKey(name: 'expires_at')
  final DateTime? expiresAt;
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
    return 'SuspensionModel(id: $id, playerId: $playerId, tournamentId: $tournamentId, matchId: $matchId, reason: $reason, yellowCardCount: $yellowCardCount, matchesSuspended: $matchesSuspended, matchesServed: $matchesServed, isActive: $isActive, suspendedAt: $suspendedAt, expiresAt: $expiresAt, notes: $notes, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SuspensionModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.playerId, playerId) ||
                other.playerId == playerId) &&
            (identical(other.tournamentId, tournamentId) ||
                other.tournamentId == tournamentId) &&
            (identical(other.matchId, matchId) || other.matchId == matchId) &&
            (identical(other.reason, reason) || other.reason == reason) &&
            (identical(other.yellowCardCount, yellowCardCount) ||
                other.yellowCardCount == yellowCardCount) &&
            (identical(other.matchesSuspended, matchesSuspended) ||
                other.matchesSuspended == matchesSuspended) &&
            (identical(other.matchesServed, matchesServed) ||
                other.matchesServed == matchesServed) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            (identical(other.suspendedAt, suspendedAt) ||
                other.suspendedAt == suspendedAt) &&
            (identical(other.expiresAt, expiresAt) ||
                other.expiresAt == expiresAt) &&
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
      tournamentId,
      matchId,
      reason,
      yellowCardCount,
      matchesSuspended,
      matchesServed,
      isActive,
      suspendedAt,
      expiresAt,
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
          @JsonKey(name: 'tournament_id') required final String tournamentId,
          @JsonKey(name: 'match_id') final String? matchId,
          required final String reason,
          @JsonKey(name: 'yellow_card_count') final int yellowCardCount,
          @JsonKey(name: 'matches_suspended') final int matchesSuspended,
          @JsonKey(name: 'matches_served') final int matchesServed,
          @JsonKey(name: 'is_active') final bool isActive,
          @JsonKey(name: 'suspended_at') required final DateTime suspendedAt,
          @JsonKey(name: 'expires_at') final DateTime? expiresAt,
          final String? notes,
          @JsonKey(name: 'created_at') final DateTime? createdAt,
          @JsonKey(name: 'updated_at') final DateTime? updatedAt}) =
      _$SuspensionModelImpl;
  const _SuspensionModel._() : super._();

  factory _SuspensionModel.fromJson(Map<String, dynamic> json) =
      _$SuspensionModelImpl.fromJson;

  @override
  String get id;
  @override
  @JsonKey(name: 'player_id')
  String get playerId;
  @override
  @JsonKey(name: 'tournament_id')
  String get tournamentId;
  @override
  @JsonKey(name: 'match_id')
  String? get matchId;
  @override
  String get reason;
  @override // 'accumulation', 'red_card', 'disciplinary'
  @JsonKey(name: 'yellow_card_count')
  int get yellowCardCount;
  @override
  @JsonKey(name: 'matches_suspended')
  int get matchesSuspended;
  @override
  @JsonKey(name: 'matches_served')
  int get matchesServed;
  @override
  @JsonKey(name: 'is_active')
  bool get isActive;
  @override
  @JsonKey(name: 'suspended_at')
  DateTime get suspendedAt;
  @override
  @JsonKey(name: 'expires_at')
  DateTime? get expiresAt;
  @override
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
