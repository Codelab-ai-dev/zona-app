// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'match_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

MatchModel _$MatchModelFromJson(Map<String, dynamic> json) {
  return _MatchModel.fromJson(json);
}

/// @nodoc
mixin _$MatchModel {
  String get id => throw _privateConstructorUsedError;
  @JsonKey(name: 'tournament_id')
  String get tournamentId => throw _privateConstructorUsedError;
  @JsonKey(name: 'home_team_id')
  String get homeTeamId => throw _privateConstructorUsedError;
  @JsonKey(name: 'away_team_id')
  String get awayTeamId => throw _privateConstructorUsedError;
  @JsonKey(name: 'match_date')
  DateTime get matchDate => throw _privateConstructorUsedError;
  String? get location => throw _privateConstructorUsedError;
  @JsonKey(name: 'jornada_number')
  int? get jornadaNumber => throw _privateConstructorUsedError;
  String get status =>
      throw _privateConstructorUsedError; // 'scheduled', 'in_progress', 'finished', 'cancelled', 'postponed'
  String? get phase =>
      throw _privateConstructorUsedError; // 'regular', 'playoffs', 'final'
  @JsonKey(name: 'playoff_round')
  String? get playoffRound =>
      throw _privateConstructorUsedError; // 'quarter_finals', 'semi_finals', 'final'
  @JsonKey(name: 'home_score')
  int? get homeScore => throw _privateConstructorUsedError;
  @JsonKey(name: 'away_score')
  int? get awayScore => throw _privateConstructorUsedError;
  @JsonKey(name: 'referee_notes')
  String? get refereeNotes => throw _privateConstructorUsedError;
  @JsonKey(name: 'is_forfeit')
  bool get isForfeit => throw _privateConstructorUsedError;
  @JsonKey(name: 'forfeit_winner')
  String? get forfeitWinner =>
      throw _privateConstructorUsedError; // 'home' or 'away'
  @JsonKey(name: 'created_at')
  DateTime? get createdAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $MatchModelCopyWith<MatchModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MatchModelCopyWith<$Res> {
  factory $MatchModelCopyWith(
          MatchModel value, $Res Function(MatchModel) then) =
      _$MatchModelCopyWithImpl<$Res, MatchModel>;
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'tournament_id') String tournamentId,
      @JsonKey(name: 'home_team_id') String homeTeamId,
      @JsonKey(name: 'away_team_id') String awayTeamId,
      @JsonKey(name: 'match_date') DateTime matchDate,
      String? location,
      @JsonKey(name: 'jornada_number') int? jornadaNumber,
      String status,
      String? phase,
      @JsonKey(name: 'playoff_round') String? playoffRound,
      @JsonKey(name: 'home_score') int? homeScore,
      @JsonKey(name: 'away_score') int? awayScore,
      @JsonKey(name: 'referee_notes') String? refereeNotes,
      @JsonKey(name: 'is_forfeit') bool isForfeit,
      @JsonKey(name: 'forfeit_winner') String? forfeitWinner,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt});
}

/// @nodoc
class _$MatchModelCopyWithImpl<$Res, $Val extends MatchModel>
    implements $MatchModelCopyWith<$Res> {
  _$MatchModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? tournamentId = null,
    Object? homeTeamId = null,
    Object? awayTeamId = null,
    Object? matchDate = null,
    Object? location = freezed,
    Object? jornadaNumber = freezed,
    Object? status = null,
    Object? phase = freezed,
    Object? playoffRound = freezed,
    Object? homeScore = freezed,
    Object? awayScore = freezed,
    Object? refereeNotes = freezed,
    Object? isForfeit = null,
    Object? forfeitWinner = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      tournamentId: null == tournamentId
          ? _value.tournamentId
          : tournamentId // ignore: cast_nullable_to_non_nullable
              as String,
      homeTeamId: null == homeTeamId
          ? _value.homeTeamId
          : homeTeamId // ignore: cast_nullable_to_non_nullable
              as String,
      awayTeamId: null == awayTeamId
          ? _value.awayTeamId
          : awayTeamId // ignore: cast_nullable_to_non_nullable
              as String,
      matchDate: null == matchDate
          ? _value.matchDate
          : matchDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      location: freezed == location
          ? _value.location
          : location // ignore: cast_nullable_to_non_nullable
              as String?,
      jornadaNumber: freezed == jornadaNumber
          ? _value.jornadaNumber
          : jornadaNumber // ignore: cast_nullable_to_non_nullable
              as int?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      phase: freezed == phase
          ? _value.phase
          : phase // ignore: cast_nullable_to_non_nullable
              as String?,
      playoffRound: freezed == playoffRound
          ? _value.playoffRound
          : playoffRound // ignore: cast_nullable_to_non_nullable
              as String?,
      homeScore: freezed == homeScore
          ? _value.homeScore
          : homeScore // ignore: cast_nullable_to_non_nullable
              as int?,
      awayScore: freezed == awayScore
          ? _value.awayScore
          : awayScore // ignore: cast_nullable_to_non_nullable
              as int?,
      refereeNotes: freezed == refereeNotes
          ? _value.refereeNotes
          : refereeNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      isForfeit: null == isForfeit
          ? _value.isForfeit
          : isForfeit // ignore: cast_nullable_to_non_nullable
              as bool,
      forfeitWinner: freezed == forfeitWinner
          ? _value.forfeitWinner
          : forfeitWinner // ignore: cast_nullable_to_non_nullable
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
abstract class _$$MatchModelImplCopyWith<$Res>
    implements $MatchModelCopyWith<$Res> {
  factory _$$MatchModelImplCopyWith(
          _$MatchModelImpl value, $Res Function(_$MatchModelImpl) then) =
      __$$MatchModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      @JsonKey(name: 'tournament_id') String tournamentId,
      @JsonKey(name: 'home_team_id') String homeTeamId,
      @JsonKey(name: 'away_team_id') String awayTeamId,
      @JsonKey(name: 'match_date') DateTime matchDate,
      String? location,
      @JsonKey(name: 'jornada_number') int? jornadaNumber,
      String status,
      String? phase,
      @JsonKey(name: 'playoff_round') String? playoffRound,
      @JsonKey(name: 'home_score') int? homeScore,
      @JsonKey(name: 'away_score') int? awayScore,
      @JsonKey(name: 'referee_notes') String? refereeNotes,
      @JsonKey(name: 'is_forfeit') bool isForfeit,
      @JsonKey(name: 'forfeit_winner') String? forfeitWinner,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt});
}

/// @nodoc
class __$$MatchModelImplCopyWithImpl<$Res>
    extends _$MatchModelCopyWithImpl<$Res, _$MatchModelImpl>
    implements _$$MatchModelImplCopyWith<$Res> {
  __$$MatchModelImplCopyWithImpl(
      _$MatchModelImpl _value, $Res Function(_$MatchModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? tournamentId = null,
    Object? homeTeamId = null,
    Object? awayTeamId = null,
    Object? matchDate = null,
    Object? location = freezed,
    Object? jornadaNumber = freezed,
    Object? status = null,
    Object? phase = freezed,
    Object? playoffRound = freezed,
    Object? homeScore = freezed,
    Object? awayScore = freezed,
    Object? refereeNotes = freezed,
    Object? isForfeit = null,
    Object? forfeitWinner = freezed,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
  }) {
    return _then(_$MatchModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      tournamentId: null == tournamentId
          ? _value.tournamentId
          : tournamentId // ignore: cast_nullable_to_non_nullable
              as String,
      homeTeamId: null == homeTeamId
          ? _value.homeTeamId
          : homeTeamId // ignore: cast_nullable_to_non_nullable
              as String,
      awayTeamId: null == awayTeamId
          ? _value.awayTeamId
          : awayTeamId // ignore: cast_nullable_to_non_nullable
              as String,
      matchDate: null == matchDate
          ? _value.matchDate
          : matchDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      location: freezed == location
          ? _value.location
          : location // ignore: cast_nullable_to_non_nullable
              as String?,
      jornadaNumber: freezed == jornadaNumber
          ? _value.jornadaNumber
          : jornadaNumber // ignore: cast_nullable_to_non_nullable
              as int?,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      phase: freezed == phase
          ? _value.phase
          : phase // ignore: cast_nullable_to_non_nullable
              as String?,
      playoffRound: freezed == playoffRound
          ? _value.playoffRound
          : playoffRound // ignore: cast_nullable_to_non_nullable
              as String?,
      homeScore: freezed == homeScore
          ? _value.homeScore
          : homeScore // ignore: cast_nullable_to_non_nullable
              as int?,
      awayScore: freezed == awayScore
          ? _value.awayScore
          : awayScore // ignore: cast_nullable_to_non_nullable
              as int?,
      refereeNotes: freezed == refereeNotes
          ? _value.refereeNotes
          : refereeNotes // ignore: cast_nullable_to_non_nullable
              as String?,
      isForfeit: null == isForfeit
          ? _value.isForfeit
          : isForfeit // ignore: cast_nullable_to_non_nullable
              as bool,
      forfeitWinner: freezed == forfeitWinner
          ? _value.forfeitWinner
          : forfeitWinner // ignore: cast_nullable_to_non_nullable
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
class _$MatchModelImpl extends _MatchModel {
  const _$MatchModelImpl(
      {required this.id,
      @JsonKey(name: 'tournament_id') required this.tournamentId,
      @JsonKey(name: 'home_team_id') required this.homeTeamId,
      @JsonKey(name: 'away_team_id') required this.awayTeamId,
      @JsonKey(name: 'match_date') required this.matchDate,
      this.location,
      @JsonKey(name: 'jornada_number') this.jornadaNumber,
      required this.status,
      this.phase,
      @JsonKey(name: 'playoff_round') this.playoffRound,
      @JsonKey(name: 'home_score') this.homeScore,
      @JsonKey(name: 'away_score') this.awayScore,
      @JsonKey(name: 'referee_notes') this.refereeNotes,
      @JsonKey(name: 'is_forfeit') this.isForfeit = false,
      @JsonKey(name: 'forfeit_winner') this.forfeitWinner,
      @JsonKey(name: 'created_at') this.createdAt,
      @JsonKey(name: 'updated_at') this.updatedAt})
      : super._();

  factory _$MatchModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$MatchModelImplFromJson(json);

  @override
  final String id;
  @override
  @JsonKey(name: 'tournament_id')
  final String tournamentId;
  @override
  @JsonKey(name: 'home_team_id')
  final String homeTeamId;
  @override
  @JsonKey(name: 'away_team_id')
  final String awayTeamId;
  @override
  @JsonKey(name: 'match_date')
  final DateTime matchDate;
  @override
  final String? location;
  @override
  @JsonKey(name: 'jornada_number')
  final int? jornadaNumber;
  @override
  final String status;
// 'scheduled', 'in_progress', 'finished', 'cancelled', 'postponed'
  @override
  final String? phase;
// 'regular', 'playoffs', 'final'
  @override
  @JsonKey(name: 'playoff_round')
  final String? playoffRound;
// 'quarter_finals', 'semi_finals', 'final'
  @override
  @JsonKey(name: 'home_score')
  final int? homeScore;
  @override
  @JsonKey(name: 'away_score')
  final int? awayScore;
  @override
  @JsonKey(name: 'referee_notes')
  final String? refereeNotes;
  @override
  @JsonKey(name: 'is_forfeit')
  final bool isForfeit;
  @override
  @JsonKey(name: 'forfeit_winner')
  final String? forfeitWinner;
// 'home' or 'away'
  @override
  @JsonKey(name: 'created_at')
  final DateTime? createdAt;
  @override
  @JsonKey(name: 'updated_at')
  final DateTime? updatedAt;

  @override
  String toString() {
    return 'MatchModel(id: $id, tournamentId: $tournamentId, homeTeamId: $homeTeamId, awayTeamId: $awayTeamId, matchDate: $matchDate, location: $location, jornadaNumber: $jornadaNumber, status: $status, phase: $phase, playoffRound: $playoffRound, homeScore: $homeScore, awayScore: $awayScore, refereeNotes: $refereeNotes, isForfeit: $isForfeit, forfeitWinner: $forfeitWinner, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MatchModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.tournamentId, tournamentId) ||
                other.tournamentId == tournamentId) &&
            (identical(other.homeTeamId, homeTeamId) ||
                other.homeTeamId == homeTeamId) &&
            (identical(other.awayTeamId, awayTeamId) ||
                other.awayTeamId == awayTeamId) &&
            (identical(other.matchDate, matchDate) ||
                other.matchDate == matchDate) &&
            (identical(other.location, location) ||
                other.location == location) &&
            (identical(other.jornadaNumber, jornadaNumber) ||
                other.jornadaNumber == jornadaNumber) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.phase, phase) || other.phase == phase) &&
            (identical(other.playoffRound, playoffRound) ||
                other.playoffRound == playoffRound) &&
            (identical(other.homeScore, homeScore) ||
                other.homeScore == homeScore) &&
            (identical(other.awayScore, awayScore) ||
                other.awayScore == awayScore) &&
            (identical(other.refereeNotes, refereeNotes) ||
                other.refereeNotes == refereeNotes) &&
            (identical(other.isForfeit, isForfeit) ||
                other.isForfeit == isForfeit) &&
            (identical(other.forfeitWinner, forfeitWinner) ||
                other.forfeitWinner == forfeitWinner) &&
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
      tournamentId,
      homeTeamId,
      awayTeamId,
      matchDate,
      location,
      jornadaNumber,
      status,
      phase,
      playoffRound,
      homeScore,
      awayScore,
      refereeNotes,
      isForfeit,
      forfeitWinner,
      createdAt,
      updatedAt);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$MatchModelImplCopyWith<_$MatchModelImpl> get copyWith =>
      __$$MatchModelImplCopyWithImpl<_$MatchModelImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$MatchModelImplToJson(
      this,
    );
  }
}

abstract class _MatchModel extends MatchModel {
  const factory _MatchModel(
          {required final String id,
          @JsonKey(name: 'tournament_id') required final String tournamentId,
          @JsonKey(name: 'home_team_id') required final String homeTeamId,
          @JsonKey(name: 'away_team_id') required final String awayTeamId,
          @JsonKey(name: 'match_date') required final DateTime matchDate,
          final String? location,
          @JsonKey(name: 'jornada_number') final int? jornadaNumber,
          required final String status,
          final String? phase,
          @JsonKey(name: 'playoff_round') final String? playoffRound,
          @JsonKey(name: 'home_score') final int? homeScore,
          @JsonKey(name: 'away_score') final int? awayScore,
          @JsonKey(name: 'referee_notes') final String? refereeNotes,
          @JsonKey(name: 'is_forfeit') final bool isForfeit,
          @JsonKey(name: 'forfeit_winner') final String? forfeitWinner,
          @JsonKey(name: 'created_at') final DateTime? createdAt,
          @JsonKey(name: 'updated_at') final DateTime? updatedAt}) =
      _$MatchModelImpl;
  const _MatchModel._() : super._();

  factory _MatchModel.fromJson(Map<String, dynamic> json) =
      _$MatchModelImpl.fromJson;

  @override
  String get id;
  @override
  @JsonKey(name: 'tournament_id')
  String get tournamentId;
  @override
  @JsonKey(name: 'home_team_id')
  String get homeTeamId;
  @override
  @JsonKey(name: 'away_team_id')
  String get awayTeamId;
  @override
  @JsonKey(name: 'match_date')
  DateTime get matchDate;
  @override
  String? get location;
  @override
  @JsonKey(name: 'jornada_number')
  int? get jornadaNumber;
  @override
  String get status;
  @override // 'scheduled', 'in_progress', 'finished', 'cancelled', 'postponed'
  String? get phase;
  @override // 'regular', 'playoffs', 'final'
  @JsonKey(name: 'playoff_round')
  String? get playoffRound;
  @override // 'quarter_finals', 'semi_finals', 'final'
  @JsonKey(name: 'home_score')
  int? get homeScore;
  @override
  @JsonKey(name: 'away_score')
  int? get awayScore;
  @override
  @JsonKey(name: 'referee_notes')
  String? get refereeNotes;
  @override
  @JsonKey(name: 'is_forfeit')
  bool get isForfeit;
  @override
  @JsonKey(name: 'forfeit_winner')
  String? get forfeitWinner;
  @override // 'home' or 'away'
  @JsonKey(name: 'created_at')
  DateTime? get createdAt;
  @override
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt;
  @override
  @JsonKey(ignore: true)
  _$$MatchModelImplCopyWith<_$MatchModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
