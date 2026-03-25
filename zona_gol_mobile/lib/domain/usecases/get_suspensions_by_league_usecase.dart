import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/suspension_entity.dart';
import '../repositories/suspension_repository.dart';

class GetSuspensionsByLeagueUseCase {
  final SuspensionRepository repository;

  GetSuspensionsByLeagueUseCase(this.repository);

  Future<Either<Failure, List<SuspensionEntity>>> call(String leagueId) {
    return repository.getSuspensionsByLeague(leagueId);
  }
}
