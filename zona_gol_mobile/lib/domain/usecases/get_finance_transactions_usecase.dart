import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_enums.dart';
import '../entities/finance_transaction_entity.dart';
import '../repositories/finance_repository.dart';

class GetFinanceTransactionsParams extends Equatable {
  final String leagueId;
  final String? teamId;
  final TransactionStatus? status;
  final TransactionType? type;

  const GetFinanceTransactionsParams({
    required this.leagueId,
    this.teamId,
    this.status,
    this.type,
  });

  @override
  List<Object?> get props => [leagueId, teamId, status, type];
}

class GetFinanceTransactionsUseCase {
  final FinanceRepository repository;

  GetFinanceTransactionsUseCase(this.repository);

  Future<Either<Failure, List<FinanceTransactionEntity>>> call(
      GetFinanceTransactionsParams params) {
    return repository.getTransactions(
      params.leagueId,
      teamId: params.teamId,
      status: params.status,
      type: params.type,
    );
  }
}
