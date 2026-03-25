import 'package:equatable/equatable.dart';

abstract class LeagueStatsEvent extends Equatable {
  const LeagueStatsEvent();

  @override
  List<Object?> get props => [];
}

class LoadLeagueStatsEvent extends LeagueStatsEvent {
  final String leagueId;

  const LoadLeagueStatsEvent({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}
