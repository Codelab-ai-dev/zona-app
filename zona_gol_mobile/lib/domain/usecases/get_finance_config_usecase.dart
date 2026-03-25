import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_config_entity.dart';
import '../repositories/finance_repository.dart';

class GetFinanceConfigUseCase {
  final FinanceRepository repository;

  GetFinanceConfigUseCase(this.repository);

  Future<Either<Failure, FinanceConfigEntity>> call(String leagueId) {
    return repository.getConfig(leagueId);
  }
}
