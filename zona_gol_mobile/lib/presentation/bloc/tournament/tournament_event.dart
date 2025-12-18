import 'package:equatable/equatable.dart';
import '../../../domain/entities/tournament_entity.dart';

/// Tournament Events
/// Defines all possible events that can occur in the Tournament BLoC
abstract class TournamentEvent extends Equatable {
  const TournamentEvent();

  @override
  List<Object?> get props => [];
}

/// Load All Tournaments Event
class LoadAllTournamentsEvent extends TournamentEvent {
  final bool onlyActive;

  const LoadAllTournamentsEvent({this.onlyActive = false});

  @override
  List<Object?> get props => [onlyActive];
}

/// Load Tournament By ID Event
class LoadTournamentByIdEvent extends TournamentEvent {
  final String tournamentId;

  const LoadTournamentByIdEvent(this.tournamentId);

  @override
  List<Object?> get props => [tournamentId];
}

/// Load Tournaments By League Event
class LoadTournamentsByLeagueEvent extends TournamentEvent {
  final String leagueId;
  final bool onlyActive;

  const LoadTournamentsByLeagueEvent({
    required this.leagueId,
    this.onlyActive = false,
  });

  @override
  List<Object?> get props => [leagueId, onlyActive];
}

/// Create Tournament Event
class CreateTournamentEvent extends TournamentEvent {
  final String name;
  final String leagueId;
  final DateTime startDate;
  final DateTime endDate;
  final int? maxPlayers;
  final int maxCoachingStaff;
  final TournamentFormat format;
  final int? numberOfGroups;
  final int teamsAdvancingPerGroup;
  final int roundsPerSeason;
  final bool hasThirdPlaceMatch;

  const CreateTournamentEvent({
    required this.name,
    required this.leagueId,
    required this.startDate,
    required this.endDate,
    this.maxPlayers,
    this.maxCoachingStaff = 10,
    this.format = TournamentFormat.league,
    this.numberOfGroups,
    this.teamsAdvancingPerGroup = 2,
    this.roundsPerSeason = 1,
    this.hasThirdPlaceMatch = false,
  });

  @override
  List<Object?> get props => [
        name,
        leagueId,
        startDate,
        endDate,
        maxPlayers,
        maxCoachingStaff,
        format,
        numberOfGroups,
        teamsAdvancingPerGroup,
        roundsPerSeason,
        hasThirdPlaceMatch,
      ];
}

/// Reset Tournament State Event
class ResetTournamentStateEvent extends TournamentEvent {
  const ResetTournamentStateEvent();
}
