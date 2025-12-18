import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/tournament_entity.dart';
import '../repositories/tournament_repository.dart';

/// Get All Tournaments Use Case
///
/// Business logic for retrieving all tournaments
/// Optionally filters by active status
class GetAllTournamentsUseCase {
  final TournamentRepository repository;

  GetAllTournamentsUseCase(this.repository);

  /// Execute the use case
  ///
  /// Parameters:
  /// - [onlyActive]: If true, only active tournaments are returned (default: false)
  ///
  /// Returns:
  /// - Right([List<TournamentEntity>]): List of tournaments
  /// - Left([Failure]): Error if the operation fails
  Future<Either<Failure, List<TournamentEntity>>> call({
    bool onlyActive = false,
  }) async {
    return await repository.getAllTournaments(onlyActive: onlyActive);
  }
}
