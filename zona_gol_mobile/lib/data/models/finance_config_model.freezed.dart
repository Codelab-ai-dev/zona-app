// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'finance_config_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

FinanceConfigModel _$FinanceConfigModelFromJson(Map<String, dynamic> json) {
  return _FinanceConfigModel.fromJson(json);
}

/// @nodoc
mixin _$FinanceConfigModel {
  String get id => throw _privateConstructorUsedError;
  String get leagueId => throw _privateConstructorUsedError;
  double get registrationFee => throw _privateConstructorUsedError;
  double get monthlyFee => throw _privateConstructorUsedError;
  double get matchFee => throw _privateConstructorUsedError;
  double get yellowCardFine => throw _privateConstructorUsedError;
  double get redCardFine => throw _privateConstructorUsedError;
  double get noShowFine => throw _privateConstructorUsedError;
  double get lateArrivalFine => throw _privateConstructorUsedError;
  double get uniformViolationFine => throw _privateConstructorUsedError;
  double get misconductFine => throw _privateConstructorUsedError;
  double get forfeitFine => throw _privateConstructorUsedError;
  bool get autoGenerateFines => throw _privateConstructorUsedError;
  String get currency => throw _privateConstructorUsedError;
  DateTime? get createdAt => throw _privateConstructorUsedError;
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $FinanceConfigModelCopyWith<FinanceConfigModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FinanceConfigModelCopyWith<$Res> {
  factory $FinanceConfigModelCopyWith(
          FinanceConfigModel value, $Res Function(FinanceConfigModel) then) =
      _$FinanceConfigModelCopyWithImpl<$Res, FinanceConfigModel>;
  @useResult
  $Res call(
      {String id,
      String leagueId,
      double registrationFee,
      double monthlyFee,
      double matchFee,
      double yellowCardFine,
      double redCardFine,
      double noShowFine,
      double lateArrivalFine,
      double uniformViolationFine,
      double misconductFine,
      double forfeitFine,
      bool autoGenerateFines,
      String currency,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class _$FinanceConfigModelCopyWithImpl<$Res, $Val extends FinanceConfigModel>
    implements $FinanceConfigModelCopyWith<$Res> {
  _$FinanceConfigModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? leagueId = null,
    Object? registrationFee = null,
    Object? monthlyFee = null,
    Object? matchFee = null,
    Object? yellowCardFine = null,
    Object? redCardFine = null,
    Object? noShowFine = null,
    Object? lateArrivalFine = null,
    Object? uniformViolationFine = null,
    Object? misconductFine = null,
    Object? forfeitFine = null,
    Object? autoGenerateFines = null,
    Object? currency = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      leagueId: null == leagueId
          ? _value.leagueId
          : leagueId // ignore: cast_nullable_to_non_nullable
              as String,
      registrationFee: null == registrationFee
          ? _value.registrationFee
          : registrationFee // ignore: cast_nullable_to_non_nullable
              as double,
      monthlyFee: null == monthlyFee
          ? _value.monthlyFee
          : monthlyFee // ignore: cast_nullable_to_non_nullable
              as double,
      matchFee: null == matchFee
          ? _value.matchFee
          : matchFee // ignore: cast_nullable_to_non_nullable
              as double,
      yellowCardFine: null == yellowCardFine
          ? _value.yellowCardFine
          : yellowCardFine // ignore: cast_nullable_to_non_nullable
              as double,
      redCardFine: null == redCardFine
          ? _value.redCardFine
          : redCardFine // ignore: cast_nullable_to_non_nullable
              as double,
      noShowFine: null == noShowFine
          ? _value.noShowFine
          : noShowFine // ignore: cast_nullable_to_non_nullable
              as double,
      lateArrivalFine: null == lateArrivalFine
          ? _value.lateArrivalFine
          : lateArrivalFine // ignore: cast_nullable_to_non_nullable
              as double,
      uniformViolationFine: null == uniformViolationFine
          ? _value.uniformViolationFine
          : uniformViolationFine // ignore: cast_nullable_to_non_nullable
              as double,
      misconductFine: null == misconductFine
          ? _value.misconductFine
          : misconductFine // ignore: cast_nullable_to_non_nullable
              as double,
      forfeitFine: null == forfeitFine
          ? _value.forfeitFine
          : forfeitFine // ignore: cast_nullable_to_non_nullable
              as double,
      autoGenerateFines: null == autoGenerateFines
          ? _value.autoGenerateFines
          : autoGenerateFines // ignore: cast_nullable_to_non_nullable
              as bool,
      currency: null == currency
          ? _value.currency
          : currency // ignore: cast_nullable_to_non_nullable
              as String,
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
abstract class _$$FinanceConfigModelImplCopyWith<$Res>
    implements $FinanceConfigModelCopyWith<$Res> {
  factory _$$FinanceConfigModelImplCopyWith(_$FinanceConfigModelImpl value,
          $Res Function(_$FinanceConfigModelImpl) then) =
      __$$FinanceConfigModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String leagueId,
      double registrationFee,
      double monthlyFee,
      double matchFee,
      double yellowCardFine,
      double redCardFine,
      double noShowFine,
      double lateArrivalFine,
      double uniformViolationFine,
      double misconductFine,
      double forfeitFine,
      bool autoGenerateFines,
      String currency,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class __$$FinanceConfigModelImplCopyWithImpl<$Res>
    extends _$FinanceConfigModelCopyWithImpl<$Res, _$FinanceConfigModelImpl>
    implements _$$FinanceConfigModelImplCopyWith<$Res> {
  __$$FinanceConfigModelImplCopyWithImpl(_$FinanceConfigModelImpl _value,
      $Res Function(_$FinanceConfigModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? leagueId = null,
    Object? registrationFee = null,
    Object? monthlyFee = null,
    Object? matchFee = null,
    Object? yellowCardFine = null,
    Object? redCardFine = null,
    Object? noShowFine = null,
    Object? lateArrivalFine = null,
    Object? uniformViolationFine = null,
    Object? misconductFine = null,
    Object? forfeitFine = null,
    Object? autoGenerateFines = null,
    Object? currency = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$FinanceConfigModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      leagueId: null == leagueId
          ? _value.leagueId
          : leagueId // ignore: cast_nullable_to_non_nullable
              as String,
      registrationFee: null == registrationFee
          ? _value.registrationFee
          : registrationFee // ignore: cast_nullable_to_non_nullable
              as double,
      monthlyFee: null == monthlyFee
          ? _value.monthlyFee
          : monthlyFee // ignore: cast_nullable_to_non_nullable
              as double,
      matchFee: null == matchFee
          ? _value.matchFee
          : matchFee // ignore: cast_nullable_to_non_nullable
              as double,
      yellowCardFine: null == yellowCardFine
          ? _value.yellowCardFine
          : yellowCardFine // ignore: cast_nullable_to_non_nullable
              as double,
      redCardFine: null == redCardFine
          ? _value.redCardFine
          : redCardFine // ignore: cast_nullable_to_non_nullable
              as double,
      noShowFine: null == noShowFine
          ? _value.noShowFine
          : noShowFine // ignore: cast_nullable_to_non_nullable
              as double,
      lateArrivalFine: null == lateArrivalFine
          ? _value.lateArrivalFine
          : lateArrivalFine // ignore: cast_nullable_to_non_nullable
              as double,
      uniformViolationFine: null == uniformViolationFine
          ? _value.uniformViolationFine
          : uniformViolationFine // ignore: cast_nullable_to_non_nullable
              as double,
      misconductFine: null == misconductFine
          ? _value.misconductFine
          : misconductFine // ignore: cast_nullable_to_non_nullable
              as double,
      forfeitFine: null == forfeitFine
          ? _value.forfeitFine
          : forfeitFine // ignore: cast_nullable_to_non_nullable
              as double,
      autoGenerateFines: null == autoGenerateFines
          ? _value.autoGenerateFines
          : autoGenerateFines // ignore: cast_nullable_to_non_nullable
              as bool,
      currency: null == currency
          ? _value.currency
          : currency // ignore: cast_nullable_to_non_nullable
              as String,
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
class _$FinanceConfigModelImpl extends _FinanceConfigModel {
  const _$FinanceConfigModelImpl(
      {required this.id,
      required this.leagueId,
      this.registrationFee = 0.0,
      this.monthlyFee = 0.0,
      this.matchFee = 0.0,
      this.yellowCardFine = 0.0,
      this.redCardFine = 0.0,
      this.noShowFine = 0.0,
      this.lateArrivalFine = 0.0,
      this.uniformViolationFine = 0.0,
      this.misconductFine = 0.0,
      this.forfeitFine = 0.0,
      this.autoGenerateFines = false,
      this.currency = 'mxn',
      this.createdAt,
      this.updatedAt})
      : super._();

  factory _$FinanceConfigModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$FinanceConfigModelImplFromJson(json);

  @override
  final String id;
  @override
  final String leagueId;
  @override
  @JsonKey()
  final double registrationFee;
  @override
  @JsonKey()
  final double monthlyFee;
  @override
  @JsonKey()
  final double matchFee;
  @override
  @JsonKey()
  final double yellowCardFine;
  @override
  @JsonKey()
  final double redCardFine;
  @override
  @JsonKey()
  final double noShowFine;
  @override
  @JsonKey()
  final double lateArrivalFine;
  @override
  @JsonKey()
  final double uniformViolationFine;
  @override
  @JsonKey()
  final double misconductFine;
  @override
  @JsonKey()
  final double forfeitFine;
  @override
  @JsonKey()
  final bool autoGenerateFines;
  @override
  @JsonKey()
  final String currency;
  @override
  final DateTime? createdAt;
  @override
  final DateTime? updatedAt;

  @override
  String toString() {
    return 'FinanceConfigModel(id: $id, leagueId: $leagueId, registrationFee: $registrationFee, monthlyFee: $monthlyFee, matchFee: $matchFee, yellowCardFine: $yellowCardFine, redCardFine: $redCardFine, noShowFine: $noShowFine, lateArrivalFine: $lateArrivalFine, uniformViolationFine: $uniformViolationFine, misconductFine: $misconductFine, forfeitFine: $forfeitFine, autoGenerateFines: $autoGenerateFines, currency: $currency, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FinanceConfigModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.leagueId, leagueId) ||
                other.leagueId == leagueId) &&
            (identical(other.registrationFee, registrationFee) ||
                other.registrationFee == registrationFee) &&
            (identical(other.monthlyFee, monthlyFee) ||
                other.monthlyFee == monthlyFee) &&
            (identical(other.matchFee, matchFee) ||
                other.matchFee == matchFee) &&
            (identical(other.yellowCardFine, yellowCardFine) ||
                other.yellowCardFine == yellowCardFine) &&
            (identical(other.redCardFine, redCardFine) ||
                other.redCardFine == redCardFine) &&
            (identical(other.noShowFine, noShowFine) ||
                other.noShowFine == noShowFine) &&
            (identical(other.lateArrivalFine, lateArrivalFine) ||
                other.lateArrivalFine == lateArrivalFine) &&
            (identical(other.uniformViolationFine, uniformViolationFine) ||
                other.uniformViolationFine == uniformViolationFine) &&
            (identical(other.misconductFine, misconductFine) ||
                other.misconductFine == misconductFine) &&
            (identical(other.forfeitFine, forfeitFine) ||
                other.forfeitFine == forfeitFine) &&
            (identical(other.autoGenerateFines, autoGenerateFines) ||
                other.autoGenerateFines == autoGenerateFines) &&
            (identical(other.currency, currency) ||
                other.currency == currency) &&
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
      leagueId,
      registrationFee,
      monthlyFee,
      matchFee,
      yellowCardFine,
      redCardFine,
      noShowFine,
      lateArrivalFine,
      uniformViolationFine,
      misconductFine,
      forfeitFine,
      autoGenerateFines,
      currency,
      createdAt,
      updatedAt);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$FinanceConfigModelImplCopyWith<_$FinanceConfigModelImpl> get copyWith =>
      __$$FinanceConfigModelImplCopyWithImpl<_$FinanceConfigModelImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$FinanceConfigModelImplToJson(
      this,
    );
  }
}

abstract class _FinanceConfigModel extends FinanceConfigModel {
  const factory _FinanceConfigModel(
      {required final String id,
      required final String leagueId,
      final double registrationFee,
      final double monthlyFee,
      final double matchFee,
      final double yellowCardFine,
      final double redCardFine,
      final double noShowFine,
      final double lateArrivalFine,
      final double uniformViolationFine,
      final double misconductFine,
      final double forfeitFine,
      final bool autoGenerateFines,
      final String currency,
      final DateTime? createdAt,
      final DateTime? updatedAt}) = _$FinanceConfigModelImpl;
  const _FinanceConfigModel._() : super._();

  factory _FinanceConfigModel.fromJson(Map<String, dynamic> json) =
      _$FinanceConfigModelImpl.fromJson;

  @override
  String get id;
  @override
  String get leagueId;
  @override
  double get registrationFee;
  @override
  double get monthlyFee;
  @override
  double get matchFee;
  @override
  double get yellowCardFine;
  @override
  double get redCardFine;
  @override
  double get noShowFine;
  @override
  double get lateArrivalFine;
  @override
  double get uniformViolationFine;
  @override
  double get misconductFine;
  @override
  double get forfeitFine;
  @override
  bool get autoGenerateFines;
  @override
  String get currency;
  @override
  DateTime? get createdAt;
  @override
  DateTime? get updatedAt;
  @override
  @JsonKey(ignore: true)
  _$$FinanceConfigModelImplCopyWith<_$FinanceConfigModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
