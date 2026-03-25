import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_transaction_entity.dart';
import '../repositories/finance_repository.dart';

class GenerateFinesFromMatchParams extends Equatable {
  final String matchId;
  final String leagueId;

  const GenerateFinesFromMatchParams({
    required this.matchId,
    required this.leagueId,
  });

  @override
  List<Object?> get props => [matchId, leagueId];
}

class GenerateFinesFromMatchUseCase {
  final FinanceRepository repository;

  GenerateFinesFromMatchUseCase(this.repository);

  Future<Either<Failure, List<FinanceTransactionEntity>>> call(
      GenerateFinesFromMatchParams params) {
    return repository.generateFinesFromMatch(
      matchId: params.matchId,
      leagueId: params.leagueId,
    );
  }
}
