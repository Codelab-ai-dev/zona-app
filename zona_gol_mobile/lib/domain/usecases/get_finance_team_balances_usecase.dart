import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_team_balance_entity.dart';
import '../repositories/finance_repository.dart';

class GetFinanceTeamBalancesUseCase {
  final FinanceRepository repository;

  GetFinanceTeamBalancesUseCase(this.repository);

  Future<Either<Failure, List<FinanceTeamBalanceEntity>>> call(
      String leagueId) {
    return repository.getTeamBalances(leagueId);
  }
}
