import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/league_entity.dart';
import '../repositories/league_repository.dart';

/// Get All Leagues Use Case
///
/// Business logic for retrieving all leagues
/// Optionally filters by active status
class GetAllLeaguesUseCase {
  final LeagueRepository repository;

  GetAllLeaguesUseCase(this.repository);

  /// Execute the use case
  ///
  /// Parameters:
  /// - [onlyActive]: If true, only active leagues are returned (default: false)
  ///
  /// Returns:
  /// - Right([List<LeagueEntity>]): List of leagues
  /// - Left([Failure]): Error if the operation fails
  Future<Either<Failure, List<LeagueEntity>>> call({
    bool onlyActive = false,
  }) async {
    return await repository.getAllLeagues(onlyActive: onlyActive);
  }
}
