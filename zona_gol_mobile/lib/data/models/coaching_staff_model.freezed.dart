// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'coaching_staff_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

CoachingStaffModel _$CoachingStaffModelFromJson(Map<String, dynamic> json) {
  return _CoachingStaffModel.fromJson(json);
}

/// @nodoc
mixin _$CoachingStaffModel {
  String get id => throw _privateConstructorUsedError;
  @JsonKey(name: 'team_id')
  String get teamId => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get role => throw _privateConstructorUsedError;
  String? get photo => throw _privateConstructorUsedError;
  @JsonKey(name: 'birth_date')
  DateTime? get birthDate => throw _privateConstructorUsedError;
  String? get cedula => throw _privateConstructorUsedError;
  @JsonKey(name: 'is_active')
  bool get isActive => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_at')
  DateTime? get createdAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $CoachingStaffModelCopyWith<CoachingStaffModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CoachingStaffModelCopyWith<$Res> {
  factory $CoachingStaffModelCopyWith(
          CoachingStaffModel value, $Res Function(CoachingStaffModel) then) =
      _$CoachingStaffModelCopyWithImpl<$Res, CoachingStaffModel>;
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'team_id') String teamId,
      String name,
      String role,
      String? photo,
      @JsonKey(name: 'birth_date') DateTime? birthDate,
      String? cedula,
      @JsonKey(name: 'is_active') bool isActive,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt});
}

/// @nodoc
class _$CoachingStaffModelCopyWithImpl<$Res, $Val extends CoachingStaffModel>
    implements $CoachingStaffModelCopyWith<$Res> {
  _$CoachingStaffModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? teamId = null,
    Object? name = null,
    Object? role = null,
    Object? photo = freezed,
    Object? birthDate = freezed,
    Object? cedula = freezed,
    Object? isActive = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      teamId: null == teamId
          ? _value.teamId
          : teamId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      role: null == role
          ? _value.role
          : role // ignore: cast_nullable_to_non_nullable
              as String,
      photo: freezed == photo
          ? _value.photo
          : photo // ignore: cast_nullable_to_non_nullable
              as String?,
      birthDate: freezed == birthDate
          ? _value.birthDate
          : birthDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      cedula: freezed == cedula
          ? _value.cedula
          : cedula // ignore: cast_nullable_to_non_nullable
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
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CoachingStaffModelImplCopyWith<$Res>
    implements $CoachingStaffModelCopyWith<$Res> {
  factory _$$CoachingStaffModelImplCopyWith(_$CoachingStaffModelImpl value,
          $Res Function(_$CoachingStaffModelImpl) then) =
      __$$CoachingStaffModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'team_id') String teamId,
      String name,
      String role,
      String? photo,
      @JsonKey(name: 'birth_date') DateTime? birthDate,
      String? cedula,
      @JsonKey(name: 'is_active') bool isActive,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt});
}

/// @nodoc
class __$$CoachingStaffModelImplCopyWithImpl<$Res>
    extends _$CoachingStaffModelCopyWithImpl<$Res, _$CoachingStaffModelImpl>
    implements _$$CoachingStaffModelImplCopyWith<$Res> {
  __$$CoachingStaffModelImplCopyWithImpl(_$CoachingStaffModelImpl _value,
      $Res Function(_$CoachingStaffModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? teamId = null,
    Object? name = null,
    Object? role = null,
    Object? photo = freezed,
    Object? birthDate = freezed,
    Object? cedula = freezed,
    Object? isActive = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$CoachingStaffModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      teamId: null == teamId
          ? _value.teamId
          : teamId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      role: null == role
          ? _value.role
          : role // ignore: cast_nullable_to_non_nullable
              as String,
      photo: freezed == photo
          ? _value.photo
          : photo // ignore: cast_nullable_to_non_nullable
              as String?,
      birthDate: freezed == birthDate
          ? _value.birthDate
          : birthDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      cedula: freezed == cedula
          ? _value.cedula
          : cedula // ignore: cast_nullable_to_non_nullable
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
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CoachingStaffModelImpl implements _CoachingStaffModel {
  const _$CoachingStaffModelImpl(
      {required this.id,
      @JsonKey(name: 'team_id') required this.teamId,
      required this.name,
      required this.role,
      this.photo,
      @JsonKey(name: 'birth_date') this.birthDate,
      this.cedula,
      @JsonKey(name: 'is_active') this.isActive = true,
      @JsonKey(name: 'created_at') this.createdAt,
      @JsonKey(name: 'updated_at') this.updatedAt});

  factory _$CoachingStaffModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$CoachingStaffModelImplFromJson(json);

  @override
  final String id;
  @override
  @JsonKey(name: 'team_id')
  final String teamId;
  @override
  final String name;
  @override
  final String role;
  @override
  final String? photo;
  @override
  @JsonKey(name: 'birth_date')
  final DateTime? birthDate;
  @override
  final String? cedula;
  @override
  @JsonKey(name: 'is_active')
  final bool isActive;
  @override
  @JsonKey(name: 'created_at')
  final DateTime? createdAt;
  @override
  @JsonKey(name: 'updated_at')
  final DateTime? updatedAt;

  @override
  String toString() {
    return 'CoachingStaffModel(id: $id, teamId: $teamId, name: $name, role: $role, photo: $photo, birthDate: $birthDate, cedula: $cedula, isActive: $isActive, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CoachingStaffModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.teamId, teamId) || other.teamId == teamId) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.role, role) || other.role == role) &&
            (identical(other.photo, photo) || other.photo == photo) &&
            (identical(other.birthDate, birthDate) ||
                other.birthDate == birthDate) &&
            (identical(other.cedula, cedula) || other.cedula == cedula) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, id, teamId, name, role, photo,
      birthDate, cedula, isActive, createdAt, updatedAt);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CoachingStaffModelImplCopyWith<_$CoachingStaffModelImpl> get copyWith =>
      __$$CoachingStaffModelImplCopyWithImpl<_$CoachingStaffModelImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CoachingStaffModelImplToJson(
      this,
    );
  }
}

abstract class _CoachingStaffModel implements CoachingStaffModel {
  const factory _CoachingStaffModel(
          {required final String id,
          @JsonKey(name: 'team_id') required final String teamId,
          required final String name,
          required final String role,
          final String? photo,
          @JsonKey(name: 'birth_date') final DateTime? birthDate,
          final String? cedula,
          @JsonKey(name: 'is_active') final bool isActive,
          @JsonKey(name: 'created_at') final DateTime? createdAt,
          @JsonKey(name: 'updated_at') final DateTime? updatedAt}) =
      _$CoachingStaffModelImpl;

  factory _CoachingStaffModel.fromJson(Map<String, dynamic> json) =
      _$CoachingStaffModelImpl.fromJson;

  @override
  String get id;
  @override
  @JsonKey(name: 'team_id')
  String get teamId;
  @override
  String get name;
  @override
  String get role;
  @override
  String? get photo;
  @override
  @JsonKey(name: 'birth_date')
  DateTime? get birthDate;
  @override
  String? get cedula;
  @override
  @JsonKey(name: 'is_active')
  bool get isActive;
  @override
  @JsonKey(name: 'created_at')
  DateTime? get createdAt;
  @override
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt;
  @override
  @JsonKey(ignore: true)
  _$$CoachingStaffModelImplCopyWith<_$CoachingStaffModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
