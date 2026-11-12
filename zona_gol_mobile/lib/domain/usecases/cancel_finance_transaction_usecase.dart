import 'package:dartz/dartz.dart';
import 'package:equatable/equatable.dart';

import '../../core/errors/failures.dart';
import '../entities/finance_transaction_entity.dart';
import '../repositories/finance_repository.dart';

class CancelFinanceTransactionParams extends Equatable {
  final String leagueId;
  final String transactionId;
  final String reason;

  const CancelFinanceTransactionParams({
    required this.leagueId,
    required this.transactionId,
    required this.reason,
  });

  @override
  List<Object?> get props => [leagueId, transactionId, reason];
}

class CancelFinanceTransactionUseCase {
  final FinanceRepository repository;

  CancelFinanceTransactionUseCase(this.repository);

  Future<Either<Failure, FinanceTransactionEntity>> call(
    CancelFinanceTransactionParams params,
  ) async {
    if (params.reason.trim().isEmpty) {
      return const Left(
        ValidationFailure('Indica el motivo de la cancelación'),
      );
    }
    return repository.cancelTransaction(
      leagueId: params.leagueId,
      transactionId: params.transactionId,
      reason: params.reason.trim(),
    );
  }
}
