import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/league_entity.dart';
import '../repositories/league_repository.dart';

/// Get Leagues By Admin Use Case
///
/// Business logic for retrieving all leagues managed by a specific admin
/// Useful for league admin dashboards to show "my leagues"
class GetLeaguesByAdminUseCase {
  final LeagueRepository repository;

  GetLeaguesByAdminUseCase(this.repository);

  /// Execute the use case
  ///
  /// Parameters:
  /// - [params]: Contains the admin ID and filter options
  ///
  /// Returns:
  /// - Right([List<LeagueEntity>]): List of leagues managed by the admin
  /// - Left([Failure]): Error if the operation fails
  Future<Either<Failure, List<LeagueEntity>>> call(
    GetLeaguesByAdminParams params,
  ) async {
    // Validate admin ID
    if (params.adminId.isEmpty) {
      return Left(ValidationFailure('Admin ID cannot be empty'));
    }

    return await repository.getLeaguesByAdminId(
      params.adminId,
      onlyActive: params.onlyActive,
    );
  }
}

/// Parameters for GetLeaguesByAdminUseCase
class GetLeaguesByAdminParams extends Equatable {
  final String adminId;
  final bool onlyActive;

  const GetLeaguesByAdminParams({
    required this.adminId,
    this.onlyActive = false,
  });

  @override
  List<Object?> get props => [adminId, onlyActive];
}
