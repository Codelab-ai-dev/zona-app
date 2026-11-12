import 'package:equatable/equatable.dart';

/// League Events
/// Events that can be dispatched to the LeagueBloc
abstract class LeagueEvent extends Equatable {
  const LeagueEvent();

  @override
  List<Object?> get props => [];
}

/// Load All Leagues Event
/// [onlyActive] true: public active leagues; false: every league (super admin)
class LoadAllLeaguesEvent extends LeagueEvent {
  final bool onlyActive;

  const LoadAllLeaguesEvent({this.onlyActive = false});

  @override
  List<Object?> get props => [onlyActive];
}

/// Load League By ID Event
/// Fetches a single league by its ID
class LoadLeagueByIdEvent extends LeagueEvent {
  final String leagueId;

  const LoadLeagueByIdEvent(this.leagueId);

  @override
  List<Object?> get props => [leagueId];
}

/// Create League Event
/// Creates a new league
class CreateLeagueEvent extends LeagueEvent {
  final String name;
  final String slug;
  final String description;
  final String adminId;
  final String? logo;
  final String productMode; // 'full' or 'web_only'

  const CreateLeagueEvent({
    required this.name,
    required this.slug,
    required this.description,
    required this.adminId,
    this.logo,
    this.productMode = 'full',
  });

  @override
  List<Object?> get props => [name, slug, description, adminId, logo, productMode];
}

/// Reset League State Event
/// Resets the league state to initial
class ResetLeagueStateEvent extends LeagueEvent {
  const ResetLeagueStateEvent();
}

/// Update League Event
/// Updates an existing league
class UpdateLeagueEvent extends LeagueEvent {
  final String leagueId;
  final String? name;
  final String? slug;
  final String? description;
  final String? logo;
  final bool? isActive;

  const UpdateLeagueEvent({
    required this.leagueId,
    this.name,
    this.slug,
    this.description,
    this.logo,
    this.isActive,
  });

  @override
  List<Object?> get props => [leagueId, name, slug, description, logo, isActive];
}

/// Delete League Event
/// Soft deletes a league (sets isActive to false)
class DeleteLeagueEvent extends LeagueEvent {
  final String leagueId;

  const DeleteLeagueEvent(this.leagueId);

  @override
  List<Object?> get props => [leagueId];
}

/// Toggle League Status Event
/// Toggles the active status of a league
class ToggleLeagueStatusEvent extends LeagueEvent {
  final String leagueId;
  final bool currentStatus;

  const ToggleLeagueStatusEvent({
    required this.leagueId,
    required this.currentStatus,
  });

  @override
  List<Object?> get props => [leagueId, currentStatus];
}
