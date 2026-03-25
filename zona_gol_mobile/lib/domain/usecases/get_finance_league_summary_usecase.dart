import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_league_summary_entity.dart';
import '../repositories/finance_repository.dart';

class GetFinanceLeagueSummaryUseCase {
  final FinanceRepository repository;

  GetFinanceLeagueSummaryUseCase(this.repository);

  Future<Either<Failure, FinanceLeagueSummaryEntity>> call(String leagueId) {
    return repository.getLeagueSummary(leagueId);
  }
}
