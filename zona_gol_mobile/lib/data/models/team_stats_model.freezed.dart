// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'team_stats_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

TeamStatsModel _$TeamStatsModelFromJson(Map<String, dynamic> json) {
  return _TeamStatsModel.fromJson(json);
}

/// @nodoc
mixin _$TeamStatsModel {
  String get id => throw _privateConstructorUsedError;
  @JsonKey(name: 'team_id')
  String get teamId => throw _privateConstructorUsedError;
  @JsonKey(name: 'tournament_id')
  String get tournamentId => throw _privateConstructorUsedError;
  @JsonKey(name: 'matches_played')
  int get matchesPlayed => throw _privateConstructorUsedError;
  @JsonKey(name: 'matches_won')
  int get matchesWon => throw _privateConstructorUsedError;
  @JsonKey(name: 'matches_drawn')
  int get matchesDrawn => throw _privateConstructorUsedError;
  @JsonKey(name: 'matches_lost')
  int get matchesLost => throw _privateConstructorUsedError;
  @JsonKey(name: 'goals_for')
  int get goalsFor => throw _privateConstructorUsedError;
  @JsonKey(name: 'goals_against')
  int get goalsAgainst => throw _privateConstructorUsedError;
  int get points => throw _privateConstructorUsedError;
  @JsonKey(name: 'yellow_cards')
  int get yellowCards => throw _privateConstructorUsedError;
  @JsonKey(name: 'red_cards')
  int get redCards => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_at')
  DateTime? get createdAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TeamStatsModelCopyWith<TeamStatsModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TeamStatsModelCopyWith<$Res> {
  factory $TeamStatsModelCopyWith(
          TeamStatsModel value, $Res Function(TeamStatsModel) then) =
      _$TeamStatsModelCopyWithImpl<$Res, TeamStatsModel>;
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'team_id') String teamId,
      @JsonKey(name: 'tournament_id') String tournamentId,
      @JsonKey(name: 'matches_played') int matchesPlayed,
      @JsonKey(name: 'matches_won') int matchesWon,
      @JsonKey(name: 'matches_drawn') int matchesDrawn,
      @JsonKey(name: 'matches_lost') int matchesLost,
      @JsonKey(name: 'goals_for') int goalsFor,
      @JsonKey(name: 'goals_against') int goalsAgainst,
      int points,
      @JsonKey(name: 'yellow_cards') int yellowCards,
      @JsonKey(name: 'red_cards') int redCards,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt});
}

/// @nodoc
class _$TeamStatsModelCopyWithImpl<$Res, $Val extends TeamStatsModel>
    implements $TeamStatsModelCopyWith<$Res> {
  _$TeamStatsModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? teamId = null,
    Object? tournamentId = null,
    Object? matchesPlayed = null,
    Object? matchesWon = null,
    Object? matchesDrawn = null,
    Object? matchesLost = null,
    Object? goalsFor = null,
    Object? goalsAgainst = null,
    Object? points = null,
    Object? yellowCards = null,
    Object? redCards = null,
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
      tournamentId: null == tournamentId
          ? _value.tournamentId
          : tournamentId // ignore: cast_nullable_to_non_nullable
              as String,
      matchesPlayed: null == matchesPlayed
          ? _value.matchesPlayed
          : matchesPlayed // ignore: cast_nullable_to_non_nullable
              as int,
      matchesWon: null == matchesWon
          ? _value.matchesWon
          : matchesWon // ignore: cast_nullable_to_non_nullable
              as int,
      matchesDrawn: null == matchesDrawn
          ? _value.matchesDrawn
          : matchesDrawn // ignore: cast_nullable_to_non_nullable
              as int,
      matchesLost: null == matchesLost
          ? _value.matchesLost
          : matchesLost // ignore: cast_nullable_to_non_nullable
              as int,
      goalsFor: null == goalsFor
          ? _value.goalsFor
          : goalsFor // ignore: cast_nullable_to_non_nullable
              as int,
      goalsAgainst: null == goalsAgainst
          ? _value.goalsAgainst
          : goalsAgainst // ignore: cast_nullable_to_non_nullable
              as int,
      points: null == points
          ? _value.points
          : points // ignore: cast_nullable_to_non_nullable
              as int,
      yellowCards: null == yellowCards
          ? _value.yellowCards
          : yellowCards // ignore: cast_nullable_to_non_nullable
              as int,
      redCards: null == redCards
          ? _value.redCards
          : redCards // ignore: cast_nullable_to_non_nullable
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
abstract class _$$TeamStatsModelImplCopyWith<$Res>
    implements $TeamStatsModelCopyWith<$Res> {
  factory _$$TeamStatsModelImplCopyWith(_$TeamStatsModelImpl value,
          $Res Function(_$TeamStatsModelImpl) then) =
      __$$TeamStatsModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'team_id') String teamId,
      @JsonKey(name: 'tournament_id') String tournamentId,
      @JsonKey(name: 'matches_played') int matchesPlayed,
      @JsonKey(name: 'matches_won') int matchesWon,
      @JsonKey(name: 'matches_drawn') int matchesDrawn,
      @JsonKey(name: 'matches_lost') int matchesLost,
      @JsonKey(name: 'goals_for') int goalsFor,
      @JsonKey(name: 'goals_against') int goalsAgainst,
      int points,
      @JsonKey(name: 'yellow_cards') int yellowCards,
      @JsonKey(name: 'red_cards') int redCards,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt});
}

/// @nodoc
class __$$TeamStatsModelImplCopyWithImpl<$Res>
    extends _$TeamStatsModelCopyWithImpl<$Res, _$TeamStatsModelImpl>
    implements _$$TeamStatsModelImplCopyWith<$Res> {
  __$$TeamStatsModelImplCopyWithImpl(
      _$TeamStatsModelImpl _value, $Res Function(_$TeamStatsModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? teamId = null,
    Object? tournamentId = null,
    Object? matchesPlayed = null,
    Object? matchesWon = null,
    Object? matchesDrawn = null,
    Object? matchesLost = null,
    Object? goalsFor = null,
    Object? goalsAgainst = null,
    Object? points = null,
    Object? yellowCards = null,
    Object? redCards = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$TeamStatsModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      teamId: null == teamId
          ? _value.teamId
          : teamId // ignore: cast_nullable_to_non_nullable
              as String,
      tournamentId: null == tournamentId
          ? _value.tournamentId
          : tournamentId // ignore: cast_nullable_to_non_nullable
              as String,
      matchesPlayed: null == matchesPlayed
          ? _value.matchesPlayed
          : matchesPlayed // ignore: cast_nullable_to_non_nullable
              as int,
      matchesWon: null == matchesWon
          ? _value.matchesWon
          : matchesWon // ignore: cast_nullable_to_non_nullable
              as int,
      matchesDrawn: null == matchesDrawn
          ? _value.matchesDrawn
          : matchesDrawn // ignore: cast_nullable_to_non_nullable
              as int,
      matchesLost: null == matchesLost
          ? _value.matchesLost
          : matchesLost // ignore: cast_nullable_to_non_nullable
              as int,
      goalsFor: null == goalsFor
          ? _value.goalsFor
          : goalsFor // ignore: cast_nullable_to_non_nullable
              as int,
      goalsAgainst: null == goalsAgainst
          ? _value.goalsAgainst
          : goalsAgainst // ignore: cast_nullable_to_non_nullable
              as int,
      points: null == points
          ? _value.points
          : points // ignore: cast_nullable_to_non_nullable
              as int,
      yellowCards: null == yellowCards
          ? _value.yellowCards
          : yellowCards // ignore: cast_nullable_to_non_nullable
              as int,
      redCards: null == redCards
          ? _value.redCards
          : redCards // ignore: cast_nullable_to_non_nullable
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
class _$TeamStatsModelImpl extends _TeamStatsModel {
  const _$TeamStatsModelImpl(
      {required this.id,
      @JsonKey(name: 'team_id') required this.teamId,
      @JsonKey(name: 'tournament_id') required this.tournamentId,
      @JsonKey(name: 'matches_played') this.matchesPlayed = 0,
      @JsonKey(name: 'matches_won') this.matchesWon = 0,
      @JsonKey(name: 'matches_drawn') this.matchesDrawn = 0,
      @JsonKey(name: 'matches_lost') this.matchesLost = 0,
      @JsonKey(name: 'goals_for') this.goalsFor = 0,
      @JsonKey(name: 'goals_against') this.goalsAgainst = 0,
      this.points = 0,
      @JsonKey(name: 'yellow_cards') this.yellowCards = 0,
      @JsonKey(name: 'red_cards') this.redCards = 0,
      @JsonKey(name: 'created_at') this.createdAt,
      @JsonKey(name: 'updated_at') this.updatedAt})
      : super._();

  factory _$TeamStatsModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$TeamStatsModelImplFromJson(json);

  @override
  final String id;
  @override
  @JsonKey(name: 'team_id')
  final String teamId;
  @override
  @JsonKey(name: 'tournament_id')
  final String tournamentId;
  @override
  @JsonKey(name: 'matches_played')
  final int matchesPlayed;
  @override
  @JsonKey(name: 'matches_won')
  final int matchesWon;
  @override
  @JsonKey(name: 'matches_drawn')
  final int matchesDrawn;
  @override
  @JsonKey(name: 'matches_lost')
  final int matchesLost;
  @override
  @JsonKey(name: 'goals_for')
  final int goalsFor;
  @override
  @JsonKey(name: 'goals_against')
  final int goalsAgainst;
  @override
  @JsonKey()
  final int points;
  @override
  @JsonKey(name: 'yellow_cards')
  final int yellowCards;
  @override
  @JsonKey(name: 'red_cards')
  final int redCards;
  @override
  @JsonKey(name: 'created_at')
  final DateTime? createdAt;
  @override
  @JsonKey(name: 'updated_at')
  final DateTime? updatedAt;

  @override
  String toString() {
    return 'TeamStatsModel(id: $id, teamId: $teamId, tournamentId: $tournamentId, matchesPlayed: $matchesPlayed, matchesWon: $matchesWon, matchesDrawn: $matchesDrawn, matchesLost: $matchesLost, goalsFor: $goalsFor, goalsAgainst: $goalsAgainst, points: $points, yellowCards: $yellowCards, redCards: $redCards, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TeamStatsModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.teamId, teamId) || other.teamId == teamId) &&
            (identical(other.tournamentId, tournamentId) ||
                other.tournamentId == tournamentId) &&
            (identical(other.matchesPlayed, matchesPlayed) ||
                other.matchesPlayed == matchesPlayed) &&
            (identical(other.matchesWon, matchesWon) ||
                other.matchesWon == matchesWon) &&
            (identical(other.matchesDrawn, matchesDrawn) ||
                other.matchesDrawn == matchesDrawn) &&
            (identical(other.matchesLost, matchesLost) ||
                other.matchesLost == matchesLost) &&
            (identical(other.goalsFor, goalsFor) ||
                other.goalsFor == goalsFor) &&
            (identical(other.goalsAgainst, goalsAgainst) ||
                other.goalsAgainst == goalsAgainst) &&
            (identical(other.points, points) || other.points == points) &&
            (identical(other.yellowCards, yellowCards) ||
                other.yellowCards == yellowCards) &&
            (identical(other.redCards, redCards) ||
                other.redCards == redCards) &&
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
      teamId,
      tournamentId,
      matchesPlayed,
      matchesWon,
      matchesDrawn,
      matchesLost,
      goalsFor,
      goalsAgainst,
      points,
      yellowCards,
      redCards,
      createdAt,
      updatedAt);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TeamStatsModelImplCopyWith<_$TeamStatsModelImpl> get copyWith =>
      __$$TeamStatsModelImplCopyWithImpl<_$TeamStatsModelImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TeamStatsModelImplToJson(
      this,
    );
  }
}

abstract class _TeamStatsModel extends TeamStatsModel {
  const factory _TeamStatsModel(
          {required final String id,
          @JsonKey(name: 'team_id') required final String teamId,
          @JsonKey(name: 'tournament_id') required final String tournamentId,
          @JsonKey(name: 'matches_played') final int matchesPlayed,
          @JsonKey(name: 'matches_won') final int matchesWon,
          @JsonKey(name: 'matches_drawn') final int matchesDrawn,
          @JsonKey(name: 'matches_lost') final int matchesLost,
          @JsonKey(name: 'goals_for') final int goalsFor,
          @JsonKey(name: 'goals_against') final int goalsAgainst,
          final int points,
          @JsonKey(name: 'yellow_cards') final int yellowCards,
          @JsonKey(name: 'red_cards') final int redCards,
          @JsonKey(name: 'created_at') final DateTime? createdAt,
          @JsonKey(name: 'updated_at') final DateTime? updatedAt}) =
      _$TeamStatsModelImpl;
  const _TeamStatsModel._() : super._();

  factory _TeamStatsModel.fromJson(Map<String, dynamic> json) =
      _$TeamStatsModelImpl.fromJson;

  @override
  String get id;
  @override
  @JsonKey(name: 'team_id')
  String get teamId;
  @override
  @JsonKey(name: 'tournament_id')
  String get tournamentId;
  @override
  @JsonKey(name: 'matches_played')
  int get matchesPlayed;
  @override
  @JsonKey(name: 'matches_won')
  int get matchesWon;
  @override
  @JsonKey(name: 'matches_drawn')
  int get matchesDrawn;
  @override
  @JsonKey(name: 'matches_lost')
  int get matchesLost;
  @override
  @JsonKey(name: 'goals_for')
  int get goalsFor;
  @override
  @JsonKey(name: 'goals_against')
  int get goalsAgainst;
  @override
  int get points;
  @override
  @JsonKey(name: 'yellow_cards')
  int get yellowCards;
  @override
  @JsonKey(name: 'red_cards')
  int get redCards;
  @override
  @JsonKey(name: 'created_at')
  DateTime? get createdAt;
  @override
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt;
  @override
  @JsonKey(ignore: true)
  _$$TeamStatsModelImplCopyWith<_$TeamStatsModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
