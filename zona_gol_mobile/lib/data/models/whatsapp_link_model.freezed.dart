// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'whatsapp_link_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

WhatsAppLinkModel _$WhatsAppLinkModelFromJson(Map<String, dynamic> json) {
  return _WhatsAppLinkModel.fromJson(json);
}

/// @nodoc
mixin _$WhatsAppLinkModel {
  String get id => throw _privateConstructorUsedError;
  @JsonKey(name: 'phone_number')
  String get phoneNumber => throw _privateConstructorUsedError;
  @JsonKey(name: 'user_id')
  String? get userId => throw _privateConstructorUsedError;
  String? get role => throw _privateConstructorUsedError;
  @JsonKey(name: 'is_active')
  bool get isActive => throw _privateConstructorUsedError;
  @JsonKey(name: 'display_name')
  String? get displayName => throw _privateConstructorUsedError;
  @JsonKey(name: 'preferred_language')
  String get preferredLanguage => throw _privateConstructorUsedError;
  @JsonKey(name: 'last_interaction_at')
  DateTime? get lastInteractionAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'league_id')
  String? get leagueId => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_at')
  DateTime? get createdAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $WhatsAppLinkModelCopyWith<WhatsAppLinkModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $WhatsAppLinkModelCopyWith<$Res> {
  factory $WhatsAppLinkModelCopyWith(
          WhatsAppLinkModel value, $Res Function(WhatsAppLinkModel) then) =
      _$WhatsAppLinkModelCopyWithImpl<$Res, WhatsAppLinkModel>;
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'phone_number') String phoneNumber,
      @JsonKey(name: 'user_id') String? userId,
      String? role,
      @JsonKey(name: 'is_active') bool isActive,
      @JsonKey(name: 'display_name') String? displayName,
      @JsonKey(name: 'preferred_language') String preferredLanguage,
      @JsonKey(name: 'last_interaction_at') DateTime? lastInteractionAt,
      @JsonKey(name: 'league_id') String? leagueId,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt});
}

/// @nodoc
class _$WhatsAppLinkModelCopyWithImpl<$Res, $Val extends WhatsAppLinkModel>
    implements $WhatsAppLinkModelCopyWith<$Res> {
  _$WhatsAppLinkModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? phoneNumber = null,
    Object? userId = freezed,
    Object? role = freezed,
    Object? isActive = null,
    Object? displayName = freezed,
    Object? preferredLanguage = null,
    Object? lastInteractionAt = freezed,
    Object? leagueId = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      phoneNumber: null == phoneNumber
          ? _value.phoneNumber
          : phoneNumber // ignore: cast_nullable_to_non_nullable
              as String,
      userId: freezed == userId
          ? _value.userId
          : userId // ignore: cast_nullable_to_non_nullable
              as String?,
      role: freezed == role
          ? _value.role
          : role // ignore: cast_nullable_to_non_nullable
              as String?,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      displayName: freezed == displayName
          ? _value.displayName
          : displayName // ignore: cast_nullable_to_non_nullable
              as String?,
      preferredLanguage: null == preferredLanguage
          ? _value.preferredLanguage
          : preferredLanguage // ignore: cast_nullable_to_non_nullable
              as String,
      lastInteractionAt: freezed == lastInteractionAt
          ? _value.lastInteractionAt
          : lastInteractionAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      leagueId: freezed == leagueId
          ? _value.leagueId
          : leagueId // ignore: cast_nullable_to_non_nullable
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
abstract class _$$WhatsAppLinkModelImplCopyWith<$Res>
    implements $WhatsAppLinkModelCopyWith<$Res> {
  factory _$$WhatsAppLinkModelImplCopyWith(_$WhatsAppLinkModelImpl value,
          $Res Function(_$WhatsAppLinkModelImpl) then) =
      __$$WhatsAppLinkModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'phone_number') String phoneNumber,
      @JsonKey(name: 'user_id') String? userId,
      String? role,
      @JsonKey(name: 'is_active') bool isActive,
      @JsonKey(name: 'display_name') String? displayName,
      @JsonKey(name: 'preferred_language') String preferredLanguage,
      @JsonKey(name: 'last_interaction_at') DateTime? lastInteractionAt,
      @JsonKey(name: 'league_id') String? leagueId,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt});
}

/// @nodoc
class __$$WhatsAppLinkModelImplCopyWithImpl<$Res>
    extends _$WhatsAppLinkModelCopyWithImpl<$Res, _$WhatsAppLinkModelImpl>
    implements _$$WhatsAppLinkModelImplCopyWith<$Res> {
  __$$WhatsAppLinkModelImplCopyWithImpl(_$WhatsAppLinkModelImpl _value,
      $Res Function(_$WhatsAppLinkModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? phoneNumber = null,
    Object? userId = freezed,
    Object? role = freezed,
    Object? isActive = null,
    Object? displayName = freezed,
    Object? preferredLanguage = null,
    Object? lastInteractionAt = freezed,
    Object? leagueId = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$WhatsAppLinkModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      phoneNumber: null == phoneNumber
          ? _value.phoneNumber
          : phoneNumber // ignore: cast_nullable_to_non_nullable
              as String,
      userId: freezed == userId
          ? _value.userId
          : userId // ignore: cast_nullable_to_non_nullable
              as String?,
      role: freezed == role
          ? _value.role
          : role // ignore: cast_nullable_to_non_nullable
              as String?,
      isActive: null == isActive
          ? _value.isActive
          : isActive // ignore: cast_nullable_to_non_nullable
              as bool,
      displayName: freezed == displayName
          ? _value.displayName
          : displayName // ignore: cast_nullable_to_non_nullable
              as String?,
      preferredLanguage: null == preferredLanguage
          ? _value.preferredLanguage
          : preferredLanguage // ignore: cast_nullable_to_non_nullable
              as String,
      lastInteractionAt: freezed == lastInteractionAt
          ? _value.lastInteractionAt
          : lastInteractionAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      leagueId: freezed == leagueId
          ? _value.leagueId
          : leagueId // ignore: cast_nullable_to_non_nullable
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

@JsonSerializable(fieldRename: FieldRename.snake)
class _$WhatsAppLinkModelImpl extends _WhatsAppLinkModel {
  const _$WhatsAppLinkModelImpl(
      {required this.id,
      @JsonKey(name: 'phone_number') required this.phoneNumber,
      @JsonKey(name: 'user_id') this.userId,
      this.role,
      @JsonKey(name: 'is_active') this.isActive = true,
      @JsonKey(name: 'display_name') this.displayName,
      @JsonKey(name: 'preferred_language') this.preferredLanguage = 'es',
      @JsonKey(name: 'last_interaction_at') this.lastInteractionAt,
      @JsonKey(name: 'league_id') this.leagueId,
      @JsonKey(name: 'created_at') this.createdAt,
      @JsonKey(name: 'updated_at') this.updatedAt})
      : super._();

  factory _$WhatsAppLinkModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$WhatsAppLinkModelImplFromJson(json);

  @override
  final String id;
  @override
  @JsonKey(name: 'phone_number')
  final String phoneNumber;
  @override
  @JsonKey(name: 'user_id')
  final String? userId;
  @override
  final String? role;
  @override
  @JsonKey(name: 'is_active')
  final bool isActive;
  @override
  @JsonKey(name: 'display_name')
  final String? displayName;
  @override
  @JsonKey(name: 'preferred_language')
  final String preferredLanguage;
  @override
  @JsonKey(name: 'last_interaction_at')
  final DateTime? lastInteractionAt;
  @override
  @JsonKey(name: 'league_id')
  final String? leagueId;
  @override
  @JsonKey(name: 'created_at')
  final DateTime? createdAt;
  @override
  @JsonKey(name: 'updated_at')
  final DateTime? updatedAt;

  @override
  String toString() {
    return 'WhatsAppLinkModel(id: $id, phoneNumber: $phoneNumber, userId: $userId, role: $role, isActive: $isActive, displayName: $displayName, preferredLanguage: $preferredLanguage, lastInteractionAt: $lastInteractionAt, leagueId: $leagueId, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$WhatsAppLinkModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.phoneNumber, phoneNumber) ||
                other.phoneNumber == phoneNumber) &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.role, role) || other.role == role) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            (identical(other.displayName, displayName) ||
                other.displayName == displayName) &&
            (identical(other.preferredLanguage, preferredLanguage) ||
                other.preferredLanguage == preferredLanguage) &&
            (identical(other.lastInteractionAt, lastInteractionAt) ||
                other.lastInteractionAt == lastInteractionAt) &&
            (identical(other.leagueId, leagueId) ||
                other.leagueId == leagueId) &&
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
      phoneNumber,
      userId,
      role,
      isActive,
      displayName,
      preferredLanguage,
      lastInteractionAt,
      leagueId,
      createdAt,
      updatedAt);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$WhatsAppLinkModelImplCopyWith<_$WhatsAppLinkModelImpl> get copyWith =>
      __$$WhatsAppLinkModelImplCopyWithImpl<_$WhatsAppLinkModelImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$WhatsAppLinkModelImplToJson(
      this,
    );
  }
}

abstract class _WhatsAppLinkModel extends WhatsAppLinkModel {
  const factory _WhatsAppLinkModel(
      {required final String id,
      @JsonKey(name: 'phone_number') required final String phoneNumber,
      @JsonKey(name: 'user_id') final String? userId,
      final String? role,
      @JsonKey(name: 'is_active') final bool isActive,
      @JsonKey(name: 'display_name') final String? displayName,
      @JsonKey(name: 'preferred_language') final String preferredLanguage,
      @JsonKey(name: 'last_interaction_at') final DateTime? lastInteractionAt,
      @JsonKey(name: 'league_id') final String? leagueId,
      @JsonKey(name: 'created_at') final DateTime? createdAt,
      @JsonKey(name: 'updated_at')
      final DateTime? updatedAt}) = _$WhatsAppLinkModelImpl;
  const _WhatsAppLinkModel._() : super._();

  factory _WhatsAppLinkModel.fromJson(Map<String, dynamic> json) =
      _$WhatsAppLinkModelImpl.fromJson;

  @override
  String get id;
  @override
  @JsonKey(name: 'phone_number')
  String get phoneNumber;
  @override
  @JsonKey(name: 'user_id')
  String? get userId;
  @override
  String? get role;
  @override
  @JsonKey(name: 'is_active')
  bool get isActive;
  @override
  @JsonKey(name: 'display_name')
  String? get displayName;
  @override
  @JsonKey(name: 'preferred_language')
  String get preferredLanguage;
  @override
  @JsonKey(name: 'last_interaction_at')
  DateTime? get lastInteractionAt;
  @override
  @JsonKey(name: 'league_id')
  String? get leagueId;
  @override
  @JsonKey(name: 'created_at')
  DateTime? get createdAt;
  @override
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt;
  @override
  @JsonKey(ignore: true)
  _$$WhatsAppLinkModelImplCopyWith<_$WhatsAppLinkModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
