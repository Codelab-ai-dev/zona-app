// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'attendance_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

AttendanceModel _$AttendanceModelFromJson(Map<String, dynamic> json) {
  return _AttendanceModel.fromJson(json);
}

/// @nodoc
mixin _$AttendanceModel {
  String get id => throw _privateConstructorUsedError;
  @JsonKey(name: 'match_id')
  String get matchId => throw _privateConstructorUsedError;
  @JsonKey(name: 'player_id')
  String get playerId => throw _privateConstructorUsedError;
  @JsonKey(name: 'team_id')
  String get teamId => throw _privateConstructorUsedError;
  @JsonKey(name: 'checked_in_at')
  DateTime get checkedInAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'recognition_mode')
  String get recognitionMode =>
      throw _privateConstructorUsedError; // 'quick' or 'thorough'
  @JsonKey(name: 'device_info')
  String? get deviceInfo => throw _privateConstructorUsedError;
  @JsonKey(name: 'scanned_by_user_id')
  String? get scannedByUserId => throw _privateConstructorUsedError;
  @JsonKey(name: 'server_timestamp')
  DateTime? get serverTimestamp => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_at')
  DateTime? get createdAt => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $AttendanceModelCopyWith<AttendanceModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AttendanceModelCopyWith<$Res> {
  factory $AttendanceModelCopyWith(
          AttendanceModel value, $Res Function(AttendanceModel) then) =
      _$AttendanceModelCopyWithImpl<$Res, AttendanceModel>;
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'match_id') String matchId,
      @JsonKey(name: 'player_id') String playerId,
      @JsonKey(name: 'team_id') String teamId,
      @JsonKey(name: 'checked_in_at') DateTime checkedInAt,
      @JsonKey(name: 'recognition_mode') String recognitionMode,
      @JsonKey(name: 'device_info') String? deviceInfo,
      @JsonKey(name: 'scanned_by_user_id') String? scannedByUserId,
      @JsonKey(name: 'server_timestamp') DateTime? serverTimestamp,
      @JsonKey(name: 'created_at') DateTime? createdAt});
}

/// @nodoc
class _$AttendanceModelCopyWithImpl<$Res, $Val extends AttendanceModel>
    implements $AttendanceModelCopyWith<$Res> {
  _$AttendanceModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? matchId = null,
    Object? playerId = null,
    Object? teamId = null,
    Object? checkedInAt = null,
    Object? recognitionMode = null,
    Object? deviceInfo = freezed,
    Object? scannedByUserId = freezed,
    Object? serverTimestamp = freezed,
    Object? createdAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      matchId: null == matchId
          ? _value.matchId
          : matchId // ignore: cast_nullable_to_non_nullable
              as String,
      playerId: null == playerId
          ? _value.playerId
          : playerId // ignore: cast_nullable_to_non_nullable
              as String,
      teamId: null == teamId
          ? _value.teamId
          : teamId // ignore: cast_nullable_to_non_nullable
              as String,
      checkedInAt: null == checkedInAt
          ? _value.checkedInAt
          : checkedInAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      recognitionMode: null == recognitionMode
          ? _value.recognitionMode
          : recognitionMode // ignore: cast_nullable_to_non_nullable
              as String,
      deviceInfo: freezed == deviceInfo
          ? _value.deviceInfo
          : deviceInfo // ignore: cast_nullable_to_non_nullable
              as String?,
      scannedByUserId: freezed == scannedByUserId
          ? _value.scannedByUserId
          : scannedByUserId // ignore: cast_nullable_to_non_nullable
              as String?,
      serverTimestamp: freezed == serverTimestamp
          ? _value.serverTimestamp
          : serverTimestamp // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AttendanceModelImplCopyWith<$Res>
    implements $AttendanceModelCopyWith<$Res> {
  factory _$$AttendanceModelImplCopyWith(_$AttendanceModelImpl value,
          $Res Function(_$AttendanceModelImpl) then) =
      __$$AttendanceModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'match_id') String matchId,
      @JsonKey(name: 'player_id') String playerId,
      @JsonKey(name: 'team_id') String teamId,
      @JsonKey(name: 'checked_in_at') DateTime checkedInAt,
      @JsonKey(name: 'recognition_mode') String recognitionMode,
      @JsonKey(name: 'device_info') String? deviceInfo,
      @JsonKey(name: 'scanned_by_user_id') String? scannedByUserId,
      @JsonKey(name: 'server_timestamp') DateTime? serverTimestamp,
      @JsonKey(name: 'created_at') DateTime? createdAt});
}

/// @nodoc
class __$$AttendanceModelImplCopyWithImpl<$Res>
    extends _$AttendanceModelCopyWithImpl<$Res, _$AttendanceModelImpl>
    implements _$$AttendanceModelImplCopyWith<$Res> {
  __$$AttendanceModelImplCopyWithImpl(
      _$AttendanceModelImpl _value, $Res Function(_$AttendanceModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? matchId = null,
    Object? playerId = null,
    Object? teamId = null,
    Object? checkedInAt = null,
    Object? recognitionMode = null,
    Object? deviceInfo = freezed,
    Object? scannedByUserId = freezed,
    Object? serverTimestamp = freezed,
    Object? createdAt = freezed,
  }) {
    return _then(_$AttendanceModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      matchId: null == matchId
          ? _value.matchId
          : matchId // ignore: cast_nullable_to_non_nullable
              as String,
      playerId: null == playerId
          ? _value.playerId
          : playerId // ignore: cast_nullable_to_non_nullable
              as String,
      teamId: null == teamId
          ? _value.teamId
          : teamId // ignore: cast_nullable_to_non_nullable
              as String,
      checkedInAt: null == checkedInAt
          ? _value.checkedInAt
          : checkedInAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      recognitionMode: null == recognitionMode
          ? _value.recognitionMode
          : recognitionMode // ignore: cast_nullable_to_non_nullable
              as String,
      deviceInfo: freezed == deviceInfo
          ? _value.deviceInfo
          : deviceInfo // ignore: cast_nullable_to_non_nullable
              as String?,
      scannedByUserId: freezed == scannedByUserId
          ? _value.scannedByUserId
          : scannedByUserId // ignore: cast_nullable_to_non_nullable
              as String?,
      serverTimestamp: freezed == serverTimestamp
          ? _value.serverTimestamp
          : serverTimestamp // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AttendanceModelImpl extends _AttendanceModel {
  const _$AttendanceModelImpl(
      {required this.id,
      @JsonKey(name: 'match_id') required this.matchId,
      @JsonKey(name: 'player_id') required this.playerId,
      @JsonKey(name: 'team_id') required this.teamId,
      @JsonKey(name: 'checked_in_at') required this.checkedInAt,
      @JsonKey(name: 'recognition_mode') this.recognitionMode = 'quick',
      @JsonKey(name: 'device_info') this.deviceInfo,
      @JsonKey(name: 'scanned_by_user_id') this.scannedByUserId,
      @JsonKey(name: 'server_timestamp') this.serverTimestamp,
      @JsonKey(name: 'created_at') this.createdAt})
      : super._();

  factory _$AttendanceModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$AttendanceModelImplFromJson(json);

  @override
  final String id;
  @override
  @JsonKey(name: 'match_id')
  final String matchId;
  @override
  @JsonKey(name: 'player_id')
  final String playerId;
  @override
  @JsonKey(name: 'team_id')
  final String teamId;
  @override
  @JsonKey(name: 'checked_in_at')
  final DateTime checkedInAt;
  @override
  @JsonKey(name: 'recognition_mode')
  final String recognitionMode;
// 'quick' or 'thorough'
  @override
  @JsonKey(name: 'device_info')
  final String? deviceInfo;
  @override
  @JsonKey(name: 'scanned_by_user_id')
  final String? scannedByUserId;
  @override
  @JsonKey(name: 'server_timestamp')
  final DateTime? serverTimestamp;
  @override
  @JsonKey(name: 'created_at')
  final DateTime? createdAt;

  @override
  String toString() {
    return 'AttendanceModel(id: $id, matchId: $matchId, playerId: $playerId, teamId: $teamId, checkedInAt: $checkedInAt, recognitionMode: $recognitionMode, deviceInfo: $deviceInfo, scannedByUserId: $scannedByUserId, serverTimestamp: $serverTimestamp, createdAt: $createdAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AttendanceModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.matchId, matchId) || other.matchId == matchId) &&
            (identical(other.playerId, playerId) ||
                other.playerId == playerId) &&
            (identical(other.teamId, teamId) || other.teamId == teamId) &&
            (identical(other.checkedInAt, checkedInAt) ||
                other.checkedInAt == checkedInAt) &&
            (identical(other.recognitionMode, recognitionMode) ||
                other.recognitionMode == recognitionMode) &&
            (identical(other.deviceInfo, deviceInfo) ||
                other.deviceInfo == deviceInfo) &&
            (identical(other.scannedByUserId, scannedByUserId) ||
                other.scannedByUserId == scannedByUserId) &&
            (identical(other.serverTimestamp, serverTimestamp) ||
                other.serverTimestamp == serverTimestamp) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      matchId,
      playerId,
      teamId,
      checkedInAt,
      recognitionMode,
      deviceInfo,
      scannedByUserId,
      serverTimestamp,
      createdAt);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$AttendanceModelImplCopyWith<_$AttendanceModelImpl> get copyWith =>
      __$$AttendanceModelImplCopyWithImpl<_$AttendanceModelImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AttendanceModelImplToJson(
      this,
    );
  }
}

abstract class _AttendanceModel extends AttendanceModel {
  const factory _AttendanceModel(
          {required final String id,
          @JsonKey(name: 'match_id') required final String matchId,
          @JsonKey(name: 'player_id') required final String playerId,
          @JsonKey(name: 'team_id') required final String teamId,
          @JsonKey(name: 'checked_in_at') required final DateTime checkedInAt,
          @JsonKey(name: 'recognition_mode') final String recognitionMode,
          @JsonKey(name: 'device_info') final String? deviceInfo,
          @JsonKey(name: 'scanned_by_user_id') final String? scannedByUserId,
          @JsonKey(name: 'server_timestamp') final DateTime? serverTimestamp,
          @JsonKey(name: 'created_at') final DateTime? createdAt}) =
      _$AttendanceModelImpl;
  const _AttendanceModel._() : super._();

  factory _AttendanceModel.fromJson(Map<String, dynamic> json) =
      _$AttendanceModelImpl.fromJson;

  @override
  String get id;
  @override
  @JsonKey(name: 'match_id')
  String get matchId;
  @override
  @JsonKey(name: 'player_id')
  String get playerId;
  @override
  @JsonKey(name: 'team_id')
  String get teamId;
  @override
  @JsonKey(name: 'checked_in_at')
  DateTime get checkedInAt;
  @override
  @JsonKey(name: 'recognition_mode')
  String get recognitionMode;
  @override // 'quick' or 'thorough'
  @JsonKey(name: 'device_info')
  String? get deviceInfo;
  @override
  @JsonKey(name: 'scanned_by_user_id')
  String? get scannedByUserId;
  @override
  @JsonKey(name: 'server_timestamp')
  DateTime? get serverTimestamp;
  @override
  @JsonKey(name: 'created_at')
  DateTime? get createdAt;
  @override
  @JsonKey(ignore: true)
  _$$AttendanceModelImplCopyWith<_$AttendanceModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
