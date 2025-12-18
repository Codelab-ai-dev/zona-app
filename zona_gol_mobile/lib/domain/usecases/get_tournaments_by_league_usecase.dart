import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/tournament_entity.dart';
import '../repositories/tournament_repository.dart';

/// Get Tournaments By League Use Case
///
/// Business logic for retrieving all tournaments belonging to a specific league
/// This is essential for displaying tournaments in the league detail screen
class GetTournamentsByLeagueUseCase {
  final TournamentRepository repository;

  GetTournamentsByLeagueUseCase(this.repository);

  /// Execute the use case
  ///
  /// Parameters:
  /// - [params]: Parameters containing the league ID and filters
  ///
  /// Returns:
  /// - Right([List<TournamentEntity>]): List of tournaments for the league
  /// - Left([Failure]): Error if validation fails or operation fails
  Future<Either<Failure, List<TournamentEntity>>> call(
    GetTournamentsByLeagueParams params,
  ) async {
    // Validate league ID
    if (params.leagueId.isEmpty) {
      return Left(ValidationFailure('ID de la liga es requerido'));
    }

    return await repository.getTournamentsByLeagueId(
      params.leagueId,
      onlyActive: params.onlyActive,
    );
  }
}

/// Parameters for GetTournamentsByLeagueUseCase
class GetTournamentsByLeagueParams {
  final String leagueId;
  final bool onlyActive;

  const GetTournamentsByLeagueParams({
    required this.leagueId,
    this.onlyActive = false,
  });
}
