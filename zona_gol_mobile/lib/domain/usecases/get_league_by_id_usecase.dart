import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';
import '../../core/errors/failures.dart';
import '../entities/league_entity.dart';
import '../repositories/league_repository.dart';

/// Get League By ID Use Case
///
/// Business logic for retrieving a single league by its ID
class GetLeagueByIdUseCase {
  final LeagueRepository repository;

  GetLeagueByIdUseCase(this.repository);

  /// Execute the use case
  ///
  /// Parameters:
  /// - [params]: Contains the league ID to retrieve
  ///
  /// Returns:
  /// - Right([LeagueEntity]): The requested league
  /// - Left([Failure]): Error if the league is not found or operation fails
  Future<Either<Failure, LeagueEntity>> call(GetLeagueParams params) async {
    // Validate league ID
    if (params.leagueId.isEmpty) {
      return Left(ValidationFailure('League ID cannot be empty'));
    }

    return await repository.getLeagueById(params.leagueId);
  }
}

/// Parameters for GetLeagueByIdUseCase
class GetLeagueParams extends Equatable {
  final String leagueId;

  const GetLeagueParams({required this.leagueId});

  @override
  List<Object?> get props => [leagueId];
}
