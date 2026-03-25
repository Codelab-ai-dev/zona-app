// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'finance_transaction_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

FinanceTransactionModel _$FinanceTransactionModelFromJson(
    Map<String, dynamic> json) {
  return _FinanceTransactionModel.fromJson(json);
}

/// @nodoc
mixin _$FinanceTransactionModel {
  String get id => throw _privateConstructorUsedError;
  String get leagueId => throw _privateConstructorUsedError;
  String get teamId => throw _privateConstructorUsedError;
  String? get playerId => throw _privateConstructorUsedError;
  String? get matchId => throw _privateConstructorUsedError;
  String get transactionType => throw _privateConstructorUsedError;
  double get amount => throw _privateConstructorUsedError;
  double get amountPaid => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  String? get paymentMethod => throw _privateConstructorUsedError;
  DateTime? get paidAt => throw _privateConstructorUsedError;
  DateTime? get dueDate => throw _privateConstructorUsedError;
  DateTime? get createdAt => throw _privateConstructorUsedError;
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $FinanceTransactionModelCopyWith<FinanceTransactionModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $FinanceTransactionModelCopyWith<$Res> {
  factory $FinanceTransactionModelCopyWith(FinanceTransactionModel value,
          $Res Function(FinanceTransactionModel) then) =
      _$FinanceTransactionModelCopyWithImpl<$Res, FinanceTransactionModel>;
  @useResult
  $Res call(
      {String id,
      String leagueId,
      String teamId,
      String? playerId,
      String? matchId,
      String transactionType,
      double amount,
      double amountPaid,
      String status,
      String? description,
      String? paymentMethod,
      DateTime? paidAt,
      DateTime? dueDate,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class _$FinanceTransactionModelCopyWithImpl<$Res,
        $Val extends FinanceTransactionModel>
    implements $FinanceTransactionModelCopyWith<$Res> {
  _$FinanceTransactionModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? leagueId = null,
    Object? teamId = null,
    Object? playerId = freezed,
    Object? matchId = freezed,
    Object? transactionType = null,
    Object? amount = null,
    Object? amountPaid = null,
    Object? status = null,
    Object? description = freezed,
    Object? paymentMethod = freezed,
    Object? paidAt = freezed,
    Object? dueDate = freezed,
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
      teamId: null == teamId
          ? _value.teamId
          : teamId // ignore: cast_nullable_to_non_nullable
              as String,
      playerId: freezed == playerId
          ? _value.playerId
          : playerId // ignore: cast_nullable_to_non_nullable
              as String?,
      matchId: freezed == matchId
          ? _value.matchId
          : matchId // ignore: cast_nullable_to_non_nullable
              as String?,
      transactionType: null == transactionType
          ? _value.transactionType
          : transactionType // ignore: cast_nullable_to_non_nullable
              as String,
      amount: null == amount
          ? _value.amount
          : amount // ignore: cast_nullable_to_non_nullable
              as double,
      amountPaid: null == amountPaid
          ? _value.amountPaid
          : amountPaid // ignore: cast_nullable_to_non_nullable
              as double,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      paymentMethod: freezed == paymentMethod
          ? _value.paymentMethod
          : paymentMethod // ignore: cast_nullable_to_non_nullable
              as String?,
      paidAt: freezed == paidAt
          ? _value.paidAt
          : paidAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      dueDate: freezed == dueDate
          ? _value.dueDate
          : dueDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
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
abstract class _$$FinanceTransactionModelImplCopyWith<$Res>
    implements $FinanceTransactionModelCopyWith<$Res> {
  factory _$$FinanceTransactionModelImplCopyWith(
          _$FinanceTransactionModelImpl value,
          $Res Function(_$FinanceTransactionModelImpl) then) =
      __$$FinanceTransactionModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String leagueId,
      String teamId,
      String? playerId,
      String? matchId,
      String transactionType,
      double amount,
      double amountPaid,
      String status,
      String? description,
      String? paymentMethod,
      DateTime? paidAt,
      DateTime? dueDate,
      DateTime? createdAt,
      DateTime? updatedAt});
}

/// @nodoc
class __$$FinanceTransactionModelImplCopyWithImpl<$Res>
    extends _$FinanceTransactionModelCopyWithImpl<$Res,
        _$FinanceTransactionModelImpl>
    implements _$$FinanceTransactionModelImplCopyWith<$Res> {
  __$$FinanceTransactionModelImplCopyWithImpl(
      _$FinanceTransactionModelImpl _value,
      $Res Function(_$FinanceTransactionModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? leagueId = null,
    Object? teamId = null,
    Object? playerId = freezed,
    Object? matchId = freezed,
    Object? transactionType = null,
    Object? amount = null,
    Object? amountPaid = null,
    Object? status = null,
    Object? description = freezed,
    Object? paymentMethod = freezed,
    Object? paidAt = freezed,
    Object? dueDate = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$FinanceTransactionModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      leagueId: null == leagueId
          ? _value.leagueId
          : leagueId // ignore: cast_nullable_to_non_nullable
              as String,
      teamId: null == teamId
          ? _value.teamId
          : teamId // ignore: cast_nullable_to_non_nullable
              as String,
      playerId: freezed == playerId
          ? _value.playerId
          : playerId // ignore: cast_nullable_to_non_nullable
              as String?,
      matchId: freezed == matchId
          ? _value.matchId
          : matchId // ignore: cast_nullable_to_non_nullable
              as String?,
      transactionType: null == transactionType
          ? _value.transactionType
          : transactionType // ignore: cast_nullable_to_non_nullable
              as String,
      amount: null == amount
          ? _value.amount
          : amount // ignore: cast_nullable_to_non_nullable
              as double,
      amountPaid: null == amountPaid
          ? _value.amountPaid
          : amountPaid // ignore: cast_nullable_to_non_nullable
              as double,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      paymentMethod: freezed == paymentMethod
          ? _value.paymentMethod
          : paymentMethod // ignore: cast_nullable_to_non_nullable
              as String?,
      paidAt: freezed == paidAt
          ? _value.paidAt
          : paidAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      dueDate: freezed == dueDate
          ? _value.dueDate
          : dueDate // ignore: cast_nullable_to_non_nullable
              as DateTime?,
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
class _$FinanceTransactionModelImpl extends _FinanceTransactionModel {
  const _$FinanceTransactionModelImpl(
      {required this.id,
      required this.leagueId,
      required this.teamId,
      this.playerId,
      this.matchId,
      required this.transactionType,
      required this.amount,
      this.amountPaid = 0.0,
      this.status = 'pending',
      this.description,
      this.paymentMethod,
      this.paidAt,
      this.dueDate,
      this.createdAt,
      this.updatedAt})
      : super._();

  factory _$FinanceTransactionModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$FinanceTransactionModelImplFromJson(json);

  @override
  final String id;
  @override
  final String leagueId;
  @override
  final String teamId;
  @override
  final String? playerId;
  @override
  final String? matchId;
  @override
  final String transactionType;
  @override
  final double amount;
  @override
  @JsonKey()
  final double amountPaid;
  @override
  @JsonKey()
  final String status;
  @override
  final String? description;
  @override
  final String? paymentMethod;
  @override
  final DateTime? paidAt;
  @override
  final DateTime? dueDate;
  @override
  final DateTime? createdAt;
  @override
  final DateTime? updatedAt;

  @override
  String toString() {
    return 'FinanceTransactionModel(id: $id, leagueId: $leagueId, teamId: $teamId, playerId: $playerId, matchId: $matchId, transactionType: $transactionType, amount: $amount, amountPaid: $amountPaid, status: $status, description: $description, paymentMethod: $paymentMethod, paidAt: $paidAt, dueDate: $dueDate, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$FinanceTransactionModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.leagueId, leagueId) ||
                other.leagueId == leagueId) &&
            (identical(other.teamId, teamId) || other.teamId == teamId) &&
            (identical(other.playerId, playerId) ||
                other.playerId == playerId) &&
            (identical(other.matchId, matchId) || other.matchId == matchId) &&
            (identical(other.transactionType, transactionType) ||
                other.transactionType == transactionType) &&
            (identical(other.amount, amount) || other.amount == amount) &&
            (identical(other.amountPaid, amountPaid) ||
                other.amountPaid == amountPaid) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.paymentMethod, paymentMethod) ||
                other.paymentMethod == paymentMethod) &&
            (identical(other.paidAt, paidAt) || other.paidAt == paidAt) &&
            (identical(other.dueDate, dueDate) || other.dueDate == dueDate) &&
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
      teamId,
      playerId,
      matchId,
      transactionType,
      amount,
      amountPaid,
      status,
      description,
      paymentMethod,
      paidAt,
      dueDate,
      createdAt,
      updatedAt);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$FinanceTransactionModelImplCopyWith<_$FinanceTransactionModelImpl>
      get copyWith => __$$FinanceTransactionModelImplCopyWithImpl<
          _$FinanceTransactionModelImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$FinanceTransactionModelImplToJson(
      this,
    );
  }
}

abstract class _FinanceTransactionModel extends FinanceTransactionModel {
  const factory _FinanceTransactionModel(
      {required final String id,
      required final String leagueId,
      required final String teamId,
      final String? playerId,
      final String? matchId,
      required final String transactionType,
      required final double amount,
      final double amountPaid,
      final String status,
      final String? description,
      final String? paymentMethod,
      final DateTime? paidAt,
      final DateTime? dueDate,
      final DateTime? createdAt,
      final DateTime? updatedAt}) = _$FinanceTransactionModelImpl;
  const _FinanceTransactionModel._() : super._();

  factory _FinanceTransactionModel.fromJson(Map<String, dynamic> json) =
      _$FinanceTransactionModelImpl.fromJson;

  @override
  String get id;
  @override
  String get leagueId;
  @override
  String get teamId;
  @override
  String? get playerId;
  @override
  String? get matchId;
  @override
  String get transactionType;
  @override
  double get amount;
  @override
  double get amountPaid;
  @override
  String get status;
  @override
  String? get description;
  @override
  String? get paymentMethod;
  @override
  DateTime? get paidAt;
  @override
  DateTime? get dueDate;
  @override
  DateTime? get createdAt;
  @override
  DateTime? get updatedAt;
  @override
  @JsonKey(ignore: true)
  _$$FinanceTransactionModelImplCopyWith<_$FinanceTransactionModelImpl>
      get copyWith => throw _privateConstructorUsedError;
}
