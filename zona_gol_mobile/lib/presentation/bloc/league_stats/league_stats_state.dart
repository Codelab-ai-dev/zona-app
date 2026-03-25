import 'package:equatable/equatable.dart';
import '../../../domain/entities/league_stats_entity.dart';

abstract class LeagueStatsState extends Equatable {
  const LeagueStatsState();

  @override
  List<Object?> get props => [];
}

class LeagueStatsInitial extends LeagueStatsState {}

class LeagueStatsLoading extends LeagueStatsState {}

class LeagueStatsLoaded extends LeagueStatsState {
  final LeagueStatsEntity stats;

  const LeagueStatsLoaded({required this.stats});

  @override
  List<Object?> get props => [stats];
}

class LeagueStatsError extends LeagueStatsState {
  final String message;

  const LeagueStatsError({required this.message});

  @override
  List<Object?> get props => [message];
}
