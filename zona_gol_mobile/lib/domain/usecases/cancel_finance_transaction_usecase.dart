import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../repositories/finance_repository.dart';

class CancelFinanceTransactionUseCase {
  final FinanceRepository repository;

  CancelFinanceTransactionUseCase(this.repository);

  Future<Either<Failure, void>> call(String transactionId) {
    return repository.cancelTransaction(transactionId);
  }
}
