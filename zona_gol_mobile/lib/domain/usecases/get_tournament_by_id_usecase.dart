import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/tournament_entity.dart';
import '../repositories/tournament_repository.dart';

/// Get Tournament By ID Use Case
///
/// Business logic for retrieving a single tournament by its ID
/// Includes validation of the tournament ID
class GetTournamentByIdUseCase {
  final TournamentRepository repository;

  GetTournamentByIdUseCase(this.repository);

  /// Execute the use case
  ///
  /// Parameters:
  /// - [params]: Parameters containing the tournament ID
  ///
  /// Returns:
  /// - Right([TournamentEntity]): The tournament
  /// - Left([Failure]): Error if validation fails or tournament not found
  Future<Either<Failure, TournamentEntity>> call(
    GetTournamentParams params,
  ) async {
    // Validate tournament ID
    if (params.tournamentId.isEmpty) {
      return Left(ValidationFailure('ID del torneo es requerido'));
    }

    return await repository.getTournamentById(params.tournamentId);
  }
}

/// Parameters for GetTournamentByIdUseCase
class GetTournamentParams {
  final String tournamentId;

  const GetTournamentParams({required this.tournamentId});
}
