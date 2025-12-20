import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../repositories/league_repository.dart';

/// Delete League Use Case
///
/// Business logic for soft-deleting a league
/// Sets is_active to false instead of physical deletion
class DeleteLeagueUseCase {
  final LeagueRepository repository;

  DeleteLeagueUseCase(this.repository);

  /// Execute the use case
  ///
  /// Parameters:
  /// - [params]: Contains the league ID to delete
  ///
  /// Returns:
  /// - Right(void): Successfully deleted
  /// - Left([Failure]): Deletion error
  Future<Either<Failure, void>> call(DeleteLeagueParams params) async {
    // Validate league ID
    if (params.leagueId.isEmpty) {
      return Left(ValidationFailure('El ID de la liga es requerido'));
    }

    // Delete the league (soft delete)
    return repository.deleteLeague(params.leagueId);
  }
}

/// Parameters for DeleteLeagueUseCase
class DeleteLeagueParams extends Equatable {
  final String leagueId;

  const DeleteLeagueParams({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}
