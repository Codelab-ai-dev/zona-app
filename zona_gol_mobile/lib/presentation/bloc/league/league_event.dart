import 'package:equatable/equatable.dart';

/// League Events
/// Events that can be dispatched to the LeagueBloc
abstract class LeagueEvent extends Equatable {
  const LeagueEvent();

  @override
  List<Object?> get props => [];
}

/// Load All Leagues Event
/// Fetches all leagues, optionally filtered by active status
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

/// Load Leagues By Admin Event
/// Fetches all leagues managed by a specific admin
class LoadLeaguesByAdminEvent extends LeagueEvent {
  final String adminId;
  final bool onlyActive;

  const LoadLeaguesByAdminEvent({
    required this.adminId,
    this.onlyActive = false,
  });

  @override
  List<Object?> get props => [adminId, onlyActive];
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

/// Search Leagues Event
/// Searches leagues by name or description
class SearchLeaguesEvent extends LeagueEvent {
  final String query;
  final bool onlyActive;

  const SearchLeaguesEvent({
    required this.query,
    this.onlyActive = true,
  });

  @override
  List<Object?> get props => [query, onlyActive];
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
