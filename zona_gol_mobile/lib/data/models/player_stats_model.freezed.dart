// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'player_stats_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

PlayerStatsModel _$PlayerStatsModelFromJson(Map<String, dynamic> json) {
  return _PlayerStatsModel.fromJson(json);
}

/// @nodoc
mixin _$PlayerStatsModel {
  String get id => throw _privateConstructorUsedError;
  @JsonKey(name: 'player_id')
  String get playerId => throw _privateConstructorUsedError;
  @JsonKey(name: 'tournament_id')
  String get tournamentId => throw _privateConstructorUsedError;
  @JsonKey(name: 'matches_played')
  int get matchesPlayed => throw _privateConstructorUsedError;
  int get goals => throw _privateConstructorUsedError;
  int get assists => throw _privateConstructorUsedError;
  @JsonKey(name: 'yellow_cards')
  int get yellowCards => throw _privateConstructorUsedError;
  @JsonKey(name: 'red_cards')
  int get redCards => throw _privateConstructorUsedError;
  @JsonKey(name: 'minutes_played')
  int get minutesPlayed => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_at')
  DateTime? get createdAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $PlayerStatsModelCopyWith<PlayerStatsModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $PlayerStatsModelCopyWith<$Res> {
  factory $PlayerStatsModelCopyWith(
          PlayerStatsModel value, $Res Function(PlayerStatsModel) then) =
      _$PlayerStatsModelCopyWithImpl<$Res, PlayerStatsModel>;
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'player_id') String playerId,
      @JsonKey(name: 'tournament_id') String tournamentId,
      @JsonKey(name: 'matches_played') int matchesPlayed,
      int goals,
      int assists,
      @JsonKey(name: 'yellow_cards') int yellowCards,
      @JsonKey(name: 'red_cards') int redCards,
      @JsonKey(name: 'minutes_played') int minutesPlayed,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt});
}

/// @nodoc
class _$PlayerStatsModelCopyWithImpl<$Res, $Val extends PlayerStatsModel>
    implements $PlayerStatsModelCopyWith<$Res> {
  _$PlayerStatsModelCopyWithImpl(this._value, this._then);

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
    Object? matchesPlayed = null,
    Object? goals = null,
    Object? assists = null,
    Object? yellowCards = null,
    Object? redCards = null,
    Object? minutesPlayed = null,
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
      matchesPlayed: null == matchesPlayed
          ? _value.matchesPlayed
          : matchesPlayed // ignore: cast_nullable_to_non_nullable
              as int,
      goals: null == goals
          ? _value.goals
          : goals // ignore: cast_nullable_to_non_nullable
              as int,
      assists: null == assists
          ? _value.assists
          : assists // ignore: cast_nullable_to_non_nullable
              as int,
      yellowCards: null == yellowCards
          ? _value.yellowCards
          : yellowCards // ignore: cast_nullable_to_non_nullable
              as int,
      redCards: null == redCards
          ? _value.redCards
          : redCards // ignore: cast_nullable_to_non_nullable
              as int,
      minutesPlayed: null == minutesPlayed
          ? _value.minutesPlayed
          : minutesPlayed // ignore: cast_nullable_to_non_nullable
              as int,
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
abstract class _$$PlayerStatsModelImplCopyWith<$Res>
    implements $PlayerStatsModelCopyWith<$Res> {
  factory _$$PlayerStatsModelImplCopyWith(_$PlayerStatsModelImpl value,
          $Res Function(_$PlayerStatsModelImpl) then) =
      __$$PlayerStatsModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'player_id') String playerId,
      @JsonKey(name: 'tournament_id') String tournamentId,
      @JsonKey(name: 'matches_played') int matchesPlayed,
      int goals,
      int assists,
      @JsonKey(name: 'yellow_cards') int yellowCards,
      @JsonKey(name: 'red_cards') int redCards,
      @JsonKey(name: 'minutes_played') int minutesPlayed,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt});
}

/// @nodoc
class __$$PlayerStatsModelImplCopyWithImpl<$Res>
    extends _$PlayerStatsModelCopyWithImpl<$Res, _$PlayerStatsModelImpl>
    implements _$$PlayerStatsModelImplCopyWith<$Res> {
  __$$PlayerStatsModelImplCopyWithImpl(_$PlayerStatsModelImpl _value,
      $Res Function(_$PlayerStatsModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? playerId = null,
    Object? tournamentId = null,
    Object? matchesPlayed = null,
    Object? goals = null,
    Object? assists = null,
    Object? yellowCards = null,
    Object? redCards = null,
    Object? minutesPlayed = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$PlayerStatsModelImpl(
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
      matchesPlayed: null == matchesPlayed
          ? _value.matchesPlayed
          : matchesPlayed // ignore: cast_nullable_to_non_nullable
              as int,
      goals: null == goals
          ? _value.goals
          : goals // ignore: cast_nullable_to_non_nullable
              as int,
      assists: null == assists
          ? _value.assists
          : assists // ignore: cast_nullable_to_non_nullable
              as int,
      yellowCards: null == yellowCards
          ? _value.yellowCards
          : yellowCards // ignore: cast_nullable_to_non_nullable
              as int,
      redCards: null == redCards
          ? _value.redCards
          : redCards // ignore: cast_nullable_to_non_nullable
              as int,
      minutesPlayed: null == minutesPlayed
          ? _value.minutesPlayed
          : minutesPlayed // ignore: cast_nullable_to_non_nullable
              as int,
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
class _$PlayerStatsModelImpl extends _PlayerStatsModel {
  const _$PlayerStatsModelImpl(
      {required this.id,
      @JsonKey(name: 'player_id') required this.playerId,
      @JsonKey(name: 'tournament_id') required this.tournamentId,
      @JsonKey(name: 'matches_played') this.matchesPlayed = 0,
      this.goals = 0,
      this.assists = 0,
      @JsonKey(name: 'yellow_cards') this.yellowCards = 0,
      @JsonKey(name: 'red_cards') this.redCards = 0,
      @JsonKey(name: 'minutes_played') this.minutesPlayed = 0,
      @JsonKey(name: 'created_at') this.createdAt,
      @JsonKey(name: 'updated_at') this.updatedAt})
      : super._();

  factory _$PlayerStatsModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$PlayerStatsModelImplFromJson(json);

  @override
  final String id;
  @override
  @JsonKey(name: 'player_id')
  final String playerId;
  @override
  @JsonKey(name: 'tournament_id')
  final String tournamentId;
  @override
  @JsonKey(name: 'matches_played')
  final int matchesPlayed;
  @override
  @JsonKey()
  final int goals;
  @override
  @JsonKey()
  final int assists;
  @override
  @JsonKey(name: 'yellow_cards')
  final int yellowCards;
  @override
  @JsonKey(name: 'red_cards')
  final int redCards;
  @override
  @JsonKey(name: 'minutes_played')
  final int minutesPlayed;
  @override
  @JsonKey(name: 'created_at')
  final DateTime? createdAt;
  @override
  @JsonKey(name: 'updated_at')
  final DateTime? updatedAt;

  @override
  String toString() {
    return 'PlayerStatsModel(id: $id, playerId: $playerId, tournamentId: $tournamentId, matchesPlayed: $matchesPlayed, goals: $goals, assists: $assists, yellowCards: $yellowCards, redCards: $redCards, minutesPlayed: $minutesPlayed, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PlayerStatsModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.playerId, playerId) ||
                other.playerId == playerId) &&
            (identical(other.tournamentId, tournamentId) ||
                other.tournamentId == tournamentId) &&
            (identical(other.matchesPlayed, matchesPlayed) ||
                other.matchesPlayed == matchesPlayed) &&
            (identical(other.goals, goals) || other.goals == goals) &&
            (identical(other.assists, assists) || other.assists == assists) &&
            (identical(other.yellowCards, yellowCards) ||
                other.yellowCards == yellowCards) &&
            (identical(other.redCards, redCards) ||
                other.redCards == redCards) &&
            (identical(other.minutesPlayed, minutesPlayed) ||
                other.minutesPlayed == minutesPlayed) &&
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
      matchesPlayed,
      goals,
      assists,
      yellowCards,
      redCards,
      minutesPlayed,
      createdAt,
      updatedAt);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$PlayerStatsModelImplCopyWith<_$PlayerStatsModelImpl> get copyWith =>
      __$$PlayerStatsModelImplCopyWithImpl<_$PlayerStatsModelImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$PlayerStatsModelImplToJson(
      this,
    );
  }
}

abstract class _PlayerStatsModel extends PlayerStatsModel {
  const factory _PlayerStatsModel(
          {required final String id,
          @JsonKey(name: 'player_id') required final String playerId,
          @JsonKey(name: 'tournament_id') required final String tournamentId,
          @JsonKey(name: 'matches_played') final int matchesPlayed,
          final int goals,
          final int assists,
          @JsonKey(name: 'yellow_cards') final int yellowCards,
          @JsonKey(name: 'red_cards') final int redCards,
          @JsonKey(name: 'minutes_played') final int minutesPlayed,
          @JsonKey(name: 'created_at') final DateTime? createdAt,
          @JsonKey(name: 'updated_at') final DateTime? updatedAt}) =
      _$PlayerStatsModelImpl;
  const _PlayerStatsModel._() : super._();

  factory _PlayerStatsModel.fromJson(Map<String, dynamic> json) =
      _$PlayerStatsModelImpl.fromJson;

  @override
  String get id;
  @override
  @JsonKey(name: 'player_id')
  String get playerId;
  @override
  @JsonKey(name: 'tournament_id')
  String get tournamentId;
  @override
  @JsonKey(name: 'matches_played')
  int get matchesPlayed;
  @override
  int get goals;
  @override
  int get assists;
  @override
  @JsonKey(name: 'yellow_cards')
  int get yellowCards;
  @override
  @JsonKey(name: 'red_cards')
  int get redCards;
  @override
  @JsonKey(name: 'minutes_played')
  int get minutesPlayed;
  @override
  @JsonKey(name: 'created_at')
  DateTime? get createdAt;
  @override
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt;
  @override
  @JsonKey(ignore: true)
  _$$PlayerStatsModelImplCopyWith<_$PlayerStatsModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
