// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'tournament_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

TournamentModel _$TournamentModelFromJson(Map<String, dynamic> json) {
  return _TournamentModel.fromJson(json);
}

/// @nodoc
mixin _$TournamentModel {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  @JsonKey(name: 'league_id')
  String get leagueId => throw _privateConstructorUsedError;
  @JsonKey(name: 'start_date')
  DateTime get startDate => throw _privateConstructorUsedError;
  @JsonKey(name: 'end_date')
  DateTime get endDate => throw _privateConstructorUsedError;
  @JsonKey(name: 'is_active')
  bool get isActive => throw _privateConstructorUsedError;
  @JsonKey(name: 'created_at')
  DateTime? get createdAt => throw _privateConstructorUsedError;
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt =>
      throw _privateConstructorUsedError; // Configuration
  @JsonKey(name: 'max_players')
  int? get maxPlayers => throw _privateConstructorUsedError;
  @JsonKey(name: 'max_coaching_staff')
  int get maxCoachingStaff =>
      throw _privateConstructorUsedError; // Tournament Format
  @JsonKey(name: 'tournament_format')
  String get tournamentFormat => throw _privateConstructorUsedError;
  @JsonKey(name: 'number_of_groups')
  int? get numberOfGroups => throw _privateConstructorUsedError;
  @JsonKey(name: 'teams_advancing_per_group')
  int get teamsAdvancingPerGroup => throw _privateConstructorUsedError;
  @JsonKey(name: 'rounds_per_season')
  int get roundsPerSeason => throw _privateConstructorUsedError;
  @JsonKey(name: 'has_third_place_match')
  bool get hasThirdPlaceMatch => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TournamentModelCopyWith<TournamentModel> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TournamentModelCopyWith<$Res> {
  factory $TournamentModelCopyWith(
          TournamentModel value, $Res Function(TournamentModel) then) =
      _$TournamentModelCopyWithImpl<$Res, TournamentModel>;
  @useResult
  $Res call(
      {String id,
      String name,
      @JsonKey(name: 'league_id') String leagueId,
      @JsonKey(name: 'start_date') DateTime startDate,
      @JsonKey(name: 'end_date') DateTime endDate,
      @JsonKey(name: 'is_active') bool isActive,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt,
      @JsonKey(name: 'max_players') int? maxPlayers,
      @JsonKey(name: 'max_coaching_staff') int maxCoachingStaff,
      @JsonKey(name: 'tournament_format') String tournamentFormat,
      @JsonKey(name: 'number_of_groups') int? numberOfGroups,
      @JsonKey(name: 'teams_advancing_per_group') int teamsAdvancingPerGroup,
      @JsonKey(name: 'rounds_per_season') int roundsPerSeason,
      @JsonKey(name: 'has_third_place_match') bool hasThirdPlaceMatch});
}

/// @nodoc
class _$TournamentModelCopyWithImpl<$Res, $Val extends TournamentModel>
    implements $TournamentModelCopyWith<$Res> {
  _$TournamentModelCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? leagueId = null,
    Object? startDate = null,
    Object? endDate = null,
    Object? isActive = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? maxPlayers = freezed,
    Object? maxCoachingStaff = null,
    Object? tournamentFormat = null,
    Object? numberOfGroups = freezed,
    Object? teamsAdvancingPerGroup = null,
    Object? roundsPerSeason = null,
    Object? hasThirdPlaceMatch = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      leagueId: null == leagueId
          ? _value.leagueId
          : leagueId // ignore: cast_nullable_to_non_nullable
              as String,
      startDate: null == startDate
          ? _value.startDate
          : startDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endDate: null == endDate
          ? _value.endDate
          : endDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
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
      maxPlayers: freezed == maxPlayers
          ? _value.maxPlayers
          : maxPlayers // ignore: cast_nullable_to_non_nullable
              as int?,
      maxCoachingStaff: null == maxCoachingStaff
          ? _value.maxCoachingStaff
          : maxCoachingStaff // ignore: cast_nullable_to_non_nullable
              as int,
      tournamentFormat: null == tournamentFormat
          ? _value.tournamentFormat
          : tournamentFormat // ignore: cast_nullable_to_non_nullable
              as String,
      numberOfGroups: freezed == numberOfGroups
          ? _value.numberOfGroups
          : numberOfGroups // ignore: cast_nullable_to_non_nullable
              as int?,
      teamsAdvancingPerGroup: null == teamsAdvancingPerGroup
          ? _value.teamsAdvancingPerGroup
          : teamsAdvancingPerGroup // ignore: cast_nullable_to_non_nullable
              as int,
      roundsPerSeason: null == roundsPerSeason
          ? _value.roundsPerSeason
          : roundsPerSeason // ignore: cast_nullable_to_non_nullable
              as int,
      hasThirdPlaceMatch: null == hasThirdPlaceMatch
          ? _value.hasThirdPlaceMatch
          : hasThirdPlaceMatch // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TournamentModelImplCopyWith<$Res>
    implements $TournamentModelCopyWith<$Res> {
  factory _$$TournamentModelImplCopyWith(_$TournamentModelImpl value,
          $Res Function(_$TournamentModelImpl) then) =
      __$$TournamentModelImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      @JsonKey(name: 'league_id') String leagueId,
      @JsonKey(name: 'start_date') DateTime startDate,
      @JsonKey(name: 'end_date') DateTime endDate,
      @JsonKey(name: 'is_active') bool isActive,
      @JsonKey(name: 'created_at') DateTime? createdAt,
      @JsonKey(name: 'updated_at') DateTime? updatedAt,
      @JsonKey(name: 'max_players') int? maxPlayers,
      @JsonKey(name: 'max_coaching_staff') int maxCoachingStaff,
      @JsonKey(name: 'tournament_format') String tournamentFormat,
      @JsonKey(name: 'number_of_groups') int? numberOfGroups,
      @JsonKey(name: 'teams_advancing_per_group') int teamsAdvancingPerGroup,
      @JsonKey(name: 'rounds_per_season') int roundsPerSeason,
      @JsonKey(name: 'has_third_place_match') bool hasThirdPlaceMatch});
}

/// @nodoc
class __$$TournamentModelImplCopyWithImpl<$Res>
    extends _$TournamentModelCopyWithImpl<$Res, _$TournamentModelImpl>
    implements _$$TournamentModelImplCopyWith<$Res> {
  __$$TournamentModelImplCopyWithImpl(
      _$TournamentModelImpl _value, $Res Function(_$TournamentModelImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? leagueId = null,
    Object? startDate = null,
    Object? endDate = null,
    Object? isActive = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? maxPlayers = freezed,
    Object? maxCoachingStaff = null,
    Object? tournamentFormat = null,
    Object? numberOfGroups = freezed,
    Object? teamsAdvancingPerGroup = null,
    Object? roundsPerSeason = null,
    Object? hasThirdPlaceMatch = null,
  }) {
    return _then(_$TournamentModelImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      leagueId: null == leagueId
          ? _value.leagueId
          : leagueId // ignore: cast_nullable_to_non_nullable
              as String,
      startDate: null == startDate
          ? _value.startDate
          : startDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
      endDate: null == endDate
          ? _value.endDate
          : endDate // ignore: cast_nullable_to_non_nullable
              as DateTime,
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
      maxPlayers: freezed == maxPlayers
          ? _value.maxPlayers
          : maxPlayers // ignore: cast_nullable_to_non_nullable
              as int?,
      maxCoachingStaff: null == maxCoachingStaff
          ? _value.maxCoachingStaff
          : maxCoachingStaff // ignore: cast_nullable_to_non_nullable
              as int,
      tournamentFormat: null == tournamentFormat
          ? _value.tournamentFormat
          : tournamentFormat // ignore: cast_nullable_to_non_nullable
              as String,
      numberOfGroups: freezed == numberOfGroups
          ? _value.numberOfGroups
          : numberOfGroups // ignore: cast_nullable_to_non_nullable
              as int?,
      teamsAdvancingPerGroup: null == teamsAdvancingPerGroup
          ? _value.teamsAdvancingPerGroup
          : teamsAdvancingPerGroup // ignore: cast_nullable_to_non_nullable
              as int,
      roundsPerSeason: null == roundsPerSeason
          ? _value.roundsPerSeason
          : roundsPerSeason // ignore: cast_nullable_to_non_nullable
              as int,
      hasThirdPlaceMatch: null == hasThirdPlaceMatch
          ? _value.hasThirdPlaceMatch
          : hasThirdPlaceMatch // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TournamentModelImpl extends _TournamentModel {
  const _$TournamentModelImpl(
      {required this.id,
      required this.name,
      @JsonKey(name: 'league_id') required this.leagueId,
      @JsonKey(name: 'start_date') required this.startDate,
      @JsonKey(name: 'end_date') required this.endDate,
      @JsonKey(name: 'is_active') this.isActive = false,
      @JsonKey(name: 'created_at') this.createdAt,
      @JsonKey(name: 'updated_at') this.updatedAt,
      @JsonKey(name: 'max_players') this.maxPlayers,
      @JsonKey(name: 'max_coaching_staff') this.maxCoachingStaff = 10,
      @JsonKey(name: 'tournament_format') this.tournamentFormat = 'league',
      @JsonKey(name: 'number_of_groups') this.numberOfGroups,
      @JsonKey(name: 'teams_advancing_per_group')
      this.teamsAdvancingPerGroup = 2,
      @JsonKey(name: 'rounds_per_season') this.roundsPerSeason = 1,
      @JsonKey(name: 'has_third_place_match') this.hasThirdPlaceMatch = false})
      : super._();

  factory _$TournamentModelImpl.fromJson(Map<String, dynamic> json) =>
      _$$TournamentModelImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  @JsonKey(name: 'league_id')
  final String leagueId;
  @override
  @JsonKey(name: 'start_date')
  final DateTime startDate;
  @override
  @JsonKey(name: 'end_date')
  final DateTime endDate;
  @override
  @JsonKey(name: 'is_active')
  final bool isActive;
  @override
  @JsonKey(name: 'created_at')
  final DateTime? createdAt;
  @override
  @JsonKey(name: 'updated_at')
  final DateTime? updatedAt;
// Configuration
  @override
  @JsonKey(name: 'max_players')
  final int? maxPlayers;
  @override
  @JsonKey(name: 'max_coaching_staff')
  final int maxCoachingStaff;
// Tournament Format
  @override
  @JsonKey(name: 'tournament_format')
  final String tournamentFormat;
  @override
  @JsonKey(name: 'number_of_groups')
  final int? numberOfGroups;
  @override
  @JsonKey(name: 'teams_advancing_per_group')
  final int teamsAdvancingPerGroup;
  @override
  @JsonKey(name: 'rounds_per_season')
  final int roundsPerSeason;
  @override
  @JsonKey(name: 'has_third_place_match')
  final bool hasThirdPlaceMatch;

  @override
  String toString() {
    return 'TournamentModel(id: $id, name: $name, leagueId: $leagueId, startDate: $startDate, endDate: $endDate, isActive: $isActive, createdAt: $createdAt, updatedAt: $updatedAt, maxPlayers: $maxPlayers, maxCoachingStaff: $maxCoachingStaff, tournamentFormat: $tournamentFormat, numberOfGroups: $numberOfGroups, teamsAdvancingPerGroup: $teamsAdvancingPerGroup, roundsPerSeason: $roundsPerSeason, hasThirdPlaceMatch: $hasThirdPlaceMatch)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TournamentModelImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.leagueId, leagueId) ||
                other.leagueId == leagueId) &&
            (identical(other.startDate, startDate) ||
                other.startDate == startDate) &&
            (identical(other.endDate, endDate) || other.endDate == endDate) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt) &&
            (identical(other.maxPlayers, maxPlayers) ||
                other.maxPlayers == maxPlayers) &&
            (identical(other.maxCoachingStaff, maxCoachingStaff) ||
                other.maxCoachingStaff == maxCoachingStaff) &&
            (identical(other.tournamentFormat, tournamentFormat) ||
                other.tournamentFormat == tournamentFormat) &&
            (identical(other.numberOfGroups, numberOfGroups) ||
                other.numberOfGroups == numberOfGroups) &&
            (identical(other.teamsAdvancingPerGroup, teamsAdvancingPerGroup) ||
                other.teamsAdvancingPerGroup == teamsAdvancingPerGroup) &&
            (identical(other.roundsPerSeason, roundsPerSeason) ||
                other.roundsPerSeason == roundsPerSeason) &&
            (identical(other.hasThirdPlaceMatch, hasThirdPlaceMatch) ||
                other.hasThirdPlaceMatch == hasThirdPlaceMatch));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      name,
      leagueId,
      startDate,
      endDate,
      isActive,
      createdAt,
      updatedAt,
      maxPlayers,
      maxCoachingStaff,
      tournamentFormat,
      numberOfGroups,
      teamsAdvancingPerGroup,
      roundsPerSeason,
      hasThirdPlaceMatch);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TournamentModelImplCopyWith<_$TournamentModelImpl> get copyWith =>
      __$$TournamentModelImplCopyWithImpl<_$TournamentModelImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TournamentModelImplToJson(
      this,
    );
  }
}

abstract class _TournamentModel extends TournamentModel {
  const factory _TournamentModel(
      {required final String id,
      required final String name,
      @JsonKey(name: 'league_id') required final String leagueId,
      @JsonKey(name: 'start_date') required final DateTime startDate,
      @JsonKey(name: 'end_date') required final DateTime endDate,
      @JsonKey(name: 'is_active') final bool isActive,
      @JsonKey(name: 'created_at') final DateTime? createdAt,
      @JsonKey(name: 'updated_at') final DateTime? updatedAt,
      @JsonKey(name: 'max_players') final int? maxPlayers,
      @JsonKey(name: 'max_coaching_staff') final int maxCoachingStaff,
      @JsonKey(name: 'tournament_format') final String tournamentFormat,
      @JsonKey(name: 'number_of_groups') final int? numberOfGroups,
      @JsonKey(name: 'teams_advancing_per_group')
      final int teamsAdvancingPerGroup,
      @JsonKey(name: 'rounds_per_season') final int roundsPerSeason,
      @JsonKey(name: 'has_third_place_match')
      final bool hasThirdPlaceMatch}) = _$TournamentModelImpl;
  const _TournamentModel._() : super._();

  factory _TournamentModel.fromJson(Map<String, dynamic> json) =
      _$TournamentModelImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  @JsonKey(name: 'league_id')
  String get leagueId;
  @override
  @JsonKey(name: 'start_date')
  DateTime get startDate;
  @override
  @JsonKey(name: 'end_date')
  DateTime get endDate;
  @override
  @JsonKey(name: 'is_active')
  bool get isActive;
  @override
  @JsonKey(name: 'created_at')
  DateTime? get createdAt;
  @override
  @JsonKey(name: 'updated_at')
  DateTime? get updatedAt;
  @override // Configuration
  @JsonKey(name: 'max_players')
  int? get maxPlayers;
  @override
  @JsonKey(name: 'max_coaching_staff')
  int get maxCoachingStaff;
  @override // Tournament Format
  @JsonKey(name: 'tournament_format')
  String get tournamentFormat;
  @override
  @JsonKey(name: 'number_of_groups')
  int? get numberOfGroups;
  @override
  @JsonKey(name: 'teams_advancing_per_group')
  int get teamsAdvancingPerGroup;
  @override
  @JsonKey(name: 'rounds_per_season')
  int get roundsPerSeason;
  @override
  @JsonKey(name: 'has_third_place_match')
  bool get hasThirdPlaceMatch;
  @override
  @JsonKey(ignore: true)
  _$$TournamentModelImplCopyWith<_$TournamentModelImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
